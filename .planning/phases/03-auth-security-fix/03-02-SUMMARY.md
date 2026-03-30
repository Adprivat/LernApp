---
phase: 03-auth-security-fix
plan: 02
subsystem: auth
tags: [hmac-sha256, lazy-migration, supabase, typescript, security, username-enumeration, two-phase-login]

# Dependency graph
requires:
  - 03-01 (usernameToHashedEmail, isLegacyEmail, deprecated usernameToEmail in src/lib/supabase.ts)
provides:
  - Two-phase login: hashed email first, legacy fallback + fire-and-forget migration
  - register() using HMAC-SHA256 hashed email
  - Silent lazy migration of legacy users on first login
affects: [all auth flows, existing user sessions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-phase signInWithPassword: try hashedEmail, fallback to legacyEmail, migrate on success"
    - "Fire-and-forget updateUser({ email: hashedEmail }) with .catch(() => {}) for non-blocking migration"
    - "await usernameToHashedEmail() in register() — async HMAC-SHA256 derivation at registration"

key-files:
  created: []
  modified:
    - src/stores/authStore.ts

key-decisions:
  - "Non-blocking migration via fire-and-forget updateUser() — fetchProfile() reads profiles table (not auth.users.email) so no race condition"
  - "Throw legacyError (not hashedError) when both phases fail — legacyError is the definitive 'wrong credentials' signal"
  - "usernameToEmail import kept in authStore for legacy fallback path only — not used in register()"

requirements-completed: [BUG-03]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 3 Plan 02: Auth Security Fix — authStore Lazy Migration Summary

**Two-phase login with fire-and-forget HMAC-SHA256 email migration wired into authStore — new registrations use hashed email, existing legacy users authenticate transparently and are silently migrated on first login**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T21:14:00Z
- **Completed:** 2026-03-30T21:19:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Updated `register()` to use `await usernameToHashedEmail(username)` — new accounts are created with HMAC-SHA256 hashed email, not predictable `username@lernapp.local`
- Updated `login()` with two-phase login: Phase 1 tries hashed email (fast path for new and already-migrated users); Phase 2 falls back to `usernameToEmail(username)` for un-migrated existing users
- Successful legacy Phase 2 login triggers a fire-and-forget `supabase.auth.updateUser({ email: hashedEmail })` to silently migrate the user's auth email — no user action required
- If both phases fail, `legacyError` is thrown (correct "invalid credentials" signal)
- `fetchProfile()` called after auth succeeds regardless of which phase succeeded

## Task Commits

Each task was committed atomically:

1. **Task 1: Update imports and register() to use hashed email** - `121098c` (feat)
2. **Task 2: Implement two-phase login with lazy migration** - `b6c5ebc` (feat)

## Files Created/Modified

- `src/stores/authStore.ts` - Updated import, register(), and login() with two-phase auth and lazy migration

## Decisions Made

- Fire-and-forget `.catch(() => {})` pattern for `updateUser()` migration — migration failure is non-fatal; user will retry on next login (legacy fallback will succeed again)
- `fetchProfile()` reads `profiles` table by `user.id`, not from `auth.users.email`, so there is no race condition with the background email migration
- `usernameToEmail` retained in the import specifically for the legacy fallback path — this is intentional and expected per the plan
- `legacyError` thrown on dual failure (not `hashedError`) since it provides the definitive "wrong credentials" response

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npm run build` fails due to pre-existing environment issue: Node.js 20.18.0 is below the required 20.19+ for this Vite version, and the `rolldown` native binding is missing. This predates these changes. `npx tsc --noEmit` passes with zero errors, confirming the code is type-correct.

## Known Stubs

None. The lazy migration is fully wired — no placeholder data paths or TODO markers remain in the auth flow.

## Self-Check: PASSED

- `src/stores/authStore.ts` — FOUND
- `03-02-SUMMARY.md` — FOUND
- Commit `121098c` — FOUND
- Commit `b6c5ebc` — FOUND
- `grep -c "usernameToHashedEmail" src/stores/authStore.ts` returns 3 — PASSED
- `grep -c "updateUser" src/stores/authStore.ts` returns 1 — PASSED
- `usernameToEmail` only in import and legacy fallback of login() — PASSED
- No `usernameToEmail` in register() — PASSED

---
*Phase: 03-auth-security-fix*
*Completed: 2026-03-30*
