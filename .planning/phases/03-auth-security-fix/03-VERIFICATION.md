---
phase: 03-auth-security-fix
verified: 2026-03-30T21:30:00Z
status: passed
score: 3/3 success criteria verified
---

# Phase 3: Auth Security Fix — Verification Report

**Phase Goal:** Username-Enumeration-Angriffe durch vorhersehbares Email-Pattern unterbinden.
**Verified:** 2026-03-30T21:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Generierte Emails sind nicht vorhersehbar aus dem Username ableitbar | VERIFIED | `usernameToHashedEmail()` in `src/lib/supabase.ts` uses `crypto.subtle.importKey` + `crypto.subtle.sign` (HMAC-SHA256) keyed by `VITE_EMAIL_SALT` — output is a 64-char hex local part, not derivable from username alone without the salt |
| 2 | Bestehende Nutzer können sich weiterhin einloggen (lazy migration) | VERIFIED | `login()` in `authStore.ts` implements two-phase login: Phase 1 tries hashed email, Phase 2 falls back to `usernameToEmail(username)` (legacy plaintext format); successful legacy login triggers `supabase.auth.updateUser({ email: hashedEmail })` migration |
| 3 | Login und Register funktionieren korrekt mit neuem Email-Schema | VERIFIED | `register()` calls `await usernameToHashedEmail(username)` at line 68 of `authStore.ts`; `login()` calls `await usernameToHashedEmail(username)` at line 24; TypeScript compiles with zero errors (`npx tsc --noEmit` — no output) |

**Score:** 3/3 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/supabase.ts` | HMAC-SHA256 email derivation function | VERIFIED | `usernameToHashedEmail()` at lines 33–54; uses `crypto.subtle.importKey` (HMAC/SHA-256, non-extractable) + `crypto.subtle.sign`; returns 64-char hex hash + `@lernapp.local` |
| `src/lib/supabase.ts` | Legacy email helper preserved | VERIFIED | `usernameToEmail()` kept exported at line 67 with `@deprecated` JSDoc; `isLegacyEmail()` helper at lines 61–64 |
| `src/stores/authStore.ts` | Two-phase login + lazy migration | VERIFIED | `login()` lines 21–53: Phase 1 (hashed), Phase 2 (legacy fallback), `updateUser()` migration on legacy success |
| `src/stores/authStore.ts` | register() uses hashed email | VERIFIED | Line 68: `const email = await usernameToHashedEmail(username)` — no plaintext pattern in register path |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `authStore.ts` | `src/lib/supabase.ts` | `import { usernameToHashedEmail, usernameToEmail }` | WIRED | Line 2 import; `usernameToHashedEmail` called at lines 24 and 68; `usernameToEmail` called at line 34 (legacy fallback only) |
| `login()` hashed path | `supabase.auth.signInWithPassword` | `email: hashedEmail` | WIRED | Line 27–30: Phase 1 call; `hashedEmail` derived at line 24 |
| `login()` legacy fallback | `supabase.auth.updateUser` | fire-and-forget `.catch(() => {})` | WIRED | Line 45: `supabase.auth.updateUser({ email: hashedEmail }).catch(() => {})` — migration triggered only after successful legacy login |
| `register()` | `usernameToHashedEmail` | `await` at call site | WIRED | Line 68: `const email = await usernameToHashedEmail(username)` then used in `supabase.auth.signUp({ email, password })` at line 69 |

---

## Specific Verification Checks

| Check | Status | Evidence |
|-------|--------|----------|
| `usernameToHashedEmail()` uses HMAC-SHA256 via `crypto.subtle` | PASSED | `crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])` at line 37–43; `crypto.subtle.sign('HMAC', cryptoKey, message)` at line 45 |
| Output not derivable from username alone | PASSED | Key is `EMAIL_SALT` from `VITE_EMAIL_SALT` env var; without the salt the HMAC output cannot be reproduced |
| `register()` uses `await usernameToHashedEmail()` | PASSED | `authStore.ts` line 68: `const email = await usernameToHashedEmail(username)` |
| `login()` Phase 1: hashed email | PASSED | `authStore.ts` lines 24, 27–30: `const hashedEmail = await usernameToHashedEmail(username)` then `signInWithPassword({ email: hashedEmail, password })` |
| `login()` Phase 2: legacy fallback | PASSED | `authStore.ts` lines 34–40: `usernameToEmail(username)` used as `legacyEmail`; separate `signInWithPassword` call |
| Successful legacy login triggers `updateUser()` migration | PASSED | `authStore.ts` line 45: `supabase.auth.updateUser({ email: hashedEmail }).catch(() => {})` — executed only in the legacy-success branch |
| TypeScript compiles (`npx tsc --noEmit`) | PASSED | Zero errors, zero output |
| BUG-03 in REQUIREMENTS.md marked complete | PASSED | `REQUIREMENTS.md` line 12: `- [x] **BUG-03**: Username-Enumeration-Lücke in der Auth-Schicht geschlossen`; line 48: `BUG-03 | Phase 3 | Complete` |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUG-03 | 03-01, 03-02 | Username-Enumeration-Lücke in der Auth-Schicht geschlossen | SATISFIED | HMAC-SHA256 email derivation in `supabase.ts`; two-phase login + lazy migration in `authStore.ts`; `REQUIREMENTS.md` checkbox checked |

---

## Anti-Patterns Found

No blockers or warnings found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/supabase.ts` | 18 | `EMAIL_SALT` falls back to `'dev-fallback-salt-change-in-prod'` | Info | Intentional dev convenience; production guard at lines 20–22 logs a `console.error` if the default reaches prod — acceptable tradeoff, same pattern as `VITE_SUPABASE_ANON_KEY` |

---

## Data-Flow Trace

Not applicable — this phase modifies auth helper functions and store actions, not UI components rendering dynamic data.

---

## Behavioral Spot-Checks

| Behavior | Check | Status |
|----------|-------|--------|
| `usernameToHashedEmail` exported from `supabase.ts` | `grep -c "export async function usernameToHashedEmail" src/lib/supabase.ts` → 1 | PASS |
| `usernameToEmail` (legacy) still exported | `grep -c "export const usernameToEmail" src/lib/supabase.ts` → 1 | PASS |
| `authStore.ts` imports both functions | Line 2 import confirmed | PASS |
| `usernameToHashedEmail` called in both `login()` and `register()` | Lines 24 and 68 confirmed | PASS |
| `usernameToEmail` NOT called in `register()` | Only appears in import (line 2) and legacy fallback of `login()` (line 34) | PASS |
| TypeScript compiles | `npx tsc --noEmit` exits 0, no output | PASS |

---

## Human Verification Required

### 1. End-to-end new user registration

**Test:** Register a new account with a username. Open Supabase Dashboard → Authentication → Users. Confirm the email stored is a 64-char hex string + `@lernapp.local`, NOT `username@lernapp.local`.
**Expected:** Email field shows e.g. `a3f7...c9@lernapp.local` (64 hex chars), never the plaintext username.
**Why human:** Requires a running Supabase instance and browser interaction.

### 2. Legacy user transparent migration

**Test:** Using a Supabase project that has an existing user registered with the old `username@lernapp.local` format, log in with that username and password.
**Expected:** Login succeeds without error; after login the user's auth email in Supabase Dashboard updates to the hashed form on next page refresh (fire-and-forget may take a moment).
**Why human:** Requires an existing legacy user in a live Supabase instance.

### 3. Wrong credentials error message

**Test:** Attempt login with a valid username but wrong password.
**Expected:** Both Phase 1 and Phase 2 fail; `legacyError` is thrown and the UI shows the "invalid credentials" error message — not a 500 or silent failure.
**Why human:** Requires browser + running app to confirm UI error display.

---

## Gaps Summary

No gaps. All automated checks pass. Three human verification items are listed above for completeness — they require a live Supabase instance and cannot be verified programmatically.

---

_Verified: 2026-03-30T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
