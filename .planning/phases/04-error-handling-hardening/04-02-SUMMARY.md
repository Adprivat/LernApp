---
phase: 04-error-handling-hardening
plan: 02
subsystem: stores
tags: [error-handling, typescript, supabase, zustand]

requires:
  - 04-01 (errorHandler utility — getErrorMessage)
provides:
  - authStore with typed error handling and .single() error checks
  - gameStore with typed error handling and PGRST116-aware .single() checks
affects:
  - all pages that depend on authStore or gameStore

tech-stack:
  added: []
  patterns:
    - "getErrorMessage() used in all console.error calls — no more inline (err as any).message"
    - "PGRST116 (not found) errors treated as expected path in joinSession and fetchProfile"
    - "updateProfile returns early on error — prevents stale state from being set"

key-files:
  created: []
  modified:
    - src/stores/authStore.ts
    - src/stores/gameStore.ts

key-decisions:
  - "fetchProfile logs non-PGRST116 errors but continues — missing profile is handled by existing null check"
  - "updateProfile returns early on error — prevents setting stale data that didn't round-trip through DB"
  - "joinSession treats PGRST116 as expected (player hasn't joined yet) — only logs unexpected errors"
  - "loadSession returns early on any error — session load failure is unrecoverable for the page"

requirements-completed: [ERR-01, ERR-02]

duration: 2min
completed: 2026-03-31
---

# Phase 04 Plan 02: Store Error Handling Summary

**Typed error handling added to both Zustand stores: authStore and gameStore now import getErrorMessage, check all .single() errors, handle PGRST116 (not found) gracefully, and return early on unexpected failures**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T06:49:45Z
- **Completed:** 2026-03-31T06:51:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `authStore.ts` — added import of `getErrorMessage`, added error destructuring to `fetchProfile()` (logs non-PGRST116) and `updateProfile()` (returns early on failure)
- `gameStore.ts` — added import of `getErrorMessage`, fixed `joinSession()` to handle PGRST116 as the expected "player not yet joined" path, fixed `loadSession()` to destructure error and return early
- Zero `catch (err: any)` patterns in either store
- Both files compile cleanly with `tsc --noEmit`

## Task Commits

1. **Task 1: Fix authStore.ts error handling** — `052043e` (fix)
2. **Task 2: Fix gameStore.ts error handling** — `be04ccc` (fix)

## Files Created/Modified

- `src/stores/authStore.ts` — typed error handling with getErrorMessage in fetchProfile + updateProfile
- `src/stores/gameStore.ts` — typed error handling with getErrorMessage in joinSession + loadSession

## Decisions Made

- `fetchProfile`: logs non-PGRST116 errors but continues execution — the existing null check on profile data already handles the "no profile found" path correctly; only unexpected errors need logging.
- `updateProfile`: returns early on any error — prevents the store from calling `set({ user: data })` with null data after a failed DB update, which would silently clear the user's profile in state.
- `joinSession`: PGRST116 is the expected response when a player hasn't joined yet — logging it would be noise. Only non-PGRST116 errors (permission, network, schema) are logged.
- `loadSession`: returns early on any error — a session load failure is unrecoverable from the game page's perspective; the null check that follows is kept as a defense-in-depth fallback.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/stores/authStore.ts (getErrorMessage imported, .single() errors checked)
- FOUND: src/stores/gameStore.ts (getErrorMessage imported, PGRST116 handled)
- FOUND: commit 052043e
- FOUND: commit be04ccc
