---
phase: 03-auth-security-fix
plan: 01
subsystem: auth
tags: [hmac-sha256, web-crypto, supabase, typescript, security, username-enumeration]

# Dependency graph
requires: []
provides:
  - usernameToHashedEmail async function (HMAC-SHA256 via Web Crypto API)
  - isLegacyEmail helper for migration detection
  - VITE_EMAIL_SALT env var pattern established
  - deprecated usernameToEmail kept for lazy migration fallback
affects: [03-02-authStore-migration, any future auth flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HMAC-SHA256 email derivation using crypto.subtle.importKey + crypto.subtle.sign"
    - "Dev fallback salt with production-mode console.error guard"
    - "isLegacyEmail pattern: endsWith('@lernapp.local') && !hashedPattern.test(email)"

key-files:
  created: []
  modified:
    - src/lib/supabase.ts
    - .env.example

key-decisions:
  - "HMAC-SHA256 chosen over UUID v5 (SHA-1 too weak) and UUID v4+db-lookup (extra DB read per login)"
  - "VITE_EMAIL_SALT treated as deployment-specific salt — accepted that it is bundle-visible, consistent with VITE_SUPABASE_ANON_KEY precedent"
  - "usernameToEmail kept exported for Plan 02 lazy migration fallback (not removed yet)"
  - "Non-extractable CryptoKey (false) — key cannot be re-exported from the key object"

patterns-established:
  - "Pattern: Always .toLowerCase() username before HMAC — case-insensitive login (alice == Alice)"
  - "Pattern: 64 hex chars local part satisfies RFC 5321 64-char local part limit exactly"

requirements-completed: [BUG-03]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 3 Plan 01: Auth Security Fix — HMAC-SHA256 Email Derivation Summary

**HMAC-SHA256 email derivation replacing predictable `username@lernapp.local` with a 64-char hex local part keyed by `VITE_EMAIL_SALT` — eliminating zero-effort username enumeration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T21:08:53Z
- **Completed:** 2026-03-30T21:12:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `usernameToHashedEmail(username: string): Promise<string>` using Web Crypto API (`crypto.subtle.importKey` + `crypto.subtle.sign`) — no npm dependencies added
- Added `isLegacyEmail(email: string): boolean` helper that detects old plaintext format for lazy migration in Plan 02
- Added `VITE_EMAIL_SALT` to `.env.example` with instructional comment; `.env` updated with a generated 64-hex-char random salt
- Deprecated `usernameToEmail()` with JSDoc `@deprecated` tag while keeping it exported for Plan 02 migration fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Add usernameToHashedEmail and helpers to supabase.ts** - `16fae30` (feat)
2. **Task 2: Add VITE_EMAIL_SALT to .env.example and .env** - `4700cc7` (chore)

## Files Created/Modified
- `src/lib/supabase.ts` - Added EMAIL_SALT constant, usernameToHashedEmail(), isLegacyEmail(), prod warning, @deprecated usernameToEmail
- `.env.example` - Recreated (was deleted) with VITE_EMAIL_SALT placeholder and generation comment

## Decisions Made
- HMAC-SHA256 over all alternatives: zero extra DB reads, no schema changes, lazy migration works with single `updateUser()` call
- `VITE_EMAIL_SALT` follows established `VITE_*` pattern — bundle-visible is an accepted tradeoff (same as `VITE_SUPABASE_ANON_KEY`)
- `usernameToEmail` kept exported (not just internal) because Plan 02 authStore migration explicitly calls it as legacy fallback during two-phase login
- Non-blocking (fire-and-forget) migration recommended for Plan 02 — `fetchProfile()` reads `profiles` table, not `auth.users.email`, so no race condition

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- `npm run build` fails due to pre-existing environment issue: Node.js 20.18.0 is below the required 20.19+ for this Vite version, and the `rolldown` native binding (`@rolldown/binding-win32-x64-msvc`) is missing from node_modules. This is unrelated to the changes made in this plan. `npx tsc --noEmit` (TypeScript check) passes with zero errors, confirming the code is type-correct.

## User Setup Required
Environment variable `VITE_EMAIL_SALT` must be set to a unique random string in each deployment environment.

Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The `.env` file was updated with a generated random salt for local development. Production deployments must set their own unique salt — the production warning in `src/lib/supabase.ts` will log an error if the default dev value reaches production.

## Next Phase Readiness
- `src/lib/supabase.ts` ready for Plan 02 (`authStore` lazy migration)
- Plan 02 should: update `register()` to `await usernameToHashedEmail()`, update `login()` with two-phase login (hashed first, legacy fallback + `updateUser()` migration)
- Precondition for Plan 02: Supabase Dashboard must have "Enable email confirmations" = OFF (already required by CLAUDE.md setup)

## Self-Check: PASSED

- `src/lib/supabase.ts` — FOUND
- `.env.example` — FOUND
- `03-01-SUMMARY.md` — FOUND
- Commit `16fae30` — FOUND
- Commit `4700cc7` — FOUND

---
*Phase: 03-auth-security-fix*
*Completed: 2026-03-30*
