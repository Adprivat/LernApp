---
phase: 01-race-condition-fix
plan: 01
subsystem: database
tags: [postgresql, plpgsql, supabase, rpc, atomic, race-condition, security-definer]

# Dependency graph
requires: []
provides:
  - "accept_open_challenge(p_challenge_id, p_joiner_id) RETURNS jsonb — atomic open challenge claim with session creation"
  - "accept_targeted_challenge(p_challenge_id, p_acceptor_id) RETURNS jsonb — atomic 1v1 challenge claim with session creation"
  - "start_tournament(p_tournament_id, p_starter_id) RETURNS jsonb — atomic tournament start with game_players population"
affects:
  - 01-02  # TypeScript client changes that will call these RPC functions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic conditional UPDATE WHERE status='pending' RETURNING * INTO — the check-and-claim primitive"
    - "SECURITY DEFINER + auth.uid() guard — prevents impersonation via parameter fabrication"
    - "RAISE EXCEPTION ... USING HINT = 'machine_readable_key' — structured error signaling for client discrimination"
    - "CREATE OR REPLACE FUNCTION — idempotent SQL, safe to re-run"

key-files:
  created: []
  modified:
    - supabase/schema.sql

key-decisions:
  - "Do NOT insert game_players rows inside accept_open_challenge or accept_targeted_challenge — existing gameStore.joinSession() handles player registration after redirect (minimizes scope)"
  - "DO insert game_players inside start_tournament — tournament participants are pre-registered so atomicity matters more than deferred registration"
  - "Use HINT field not DETAIL or message for client error discrimination — P0001 is generic, HINT is the stable discriminator per PostgREST conventions"
  - "SECURITY DEFINER required to INSERT into game_sessions and notifications which bypass RLS — auth.uid() check added explicitly to compensate"

patterns-established:
  - "Race condition fix pattern: UPDATE ... WHERE status='pending' RETURNING * INTO v_row; IF v_row.id IS NULL THEN RAISE EXCEPTION ... END IF — use this for any shared-resource claim"
  - "RPC error discrimination: client checks error.hint (not error.code or error.message) for application-level errors"

requirements-completed: [BUG-01]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 01 Plan 01: SQL RPC Functions Summary

**Three atomic plpgsql RPC functions eliminating challenge and tournament race conditions via PostgreSQL UPDATE...WHERE...RETURNING row-level locking**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T11:03:13Z
- **Completed:** 2026-03-30T11:04:47Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `accept_open_challenge`: atomically claims an open challenge for a joiner, creates a game session, links it to the challenge, and notifies the challenger — all in one PostgreSQL transaction
- `accept_targeted_challenge`: same atomic pattern for 1v1 targeted challenges, with `challenged_id` guard instead of `is_open` guard
- `start_tournament`: atomically transitions a tournament from `registering` to `active`, creates a game session, and bulk-inserts `game_players` for all pre-registered participants in one transaction
- All three functions validated with `auth.uid()` guards, structured RAISE EXCEPTION with machine-readable HINT fields, and SECURITY DEFINER

## Task Commits

Each task was committed atomically:

1. **Task 1: Add accept_open_challenge and accept_targeted_challenge RPC functions** - `9ff6914` (feat)
2. **Task 2: Add start_tournament RPC function** - `c32f691` (feat)

## Files Created/Modified
- `supabase/schema.sql` - Appended three `CREATE OR REPLACE FUNCTION` blocks after existing `check_achievements` function (lines 409-620)

## Decisions Made
- Used `CREATE OR REPLACE FUNCTION` for idempotency — safe to re-run in Supabase SQL editor
- `accept_open_challenge` adds `challenger_id != p_joiner_id` guard to prevent self-joining
- `accept_targeted_challenge` uses `HINT = 'already_accepted'` (same as open challenge) so client uses one shared error handler
- `start_tournament` sets `current_round = 1` and `started_at = now()` atomically in the same UPDATE that claims the tournament
- Joiner/acceptor username is looked up via `SELECT username INTO v_name FROM public.profiles` before notification INSERT (matches research pattern)

## Deviations from Plan

None - plan executed exactly as written. The `npm run build` failure is a pre-existing environment issue (Node.js 20.18 vs required 20.19+, missing rolldown native binding). TypeScript compilation (`tsc -b`) passes with zero errors. This is not caused by schema.sql changes.

## Issues Encountered

**Pre-existing:** `npm run build` fails due to `rolldown` missing native binding (`@rolldown/binding-win32-x64-msvc`) caused by Node.js version mismatch (20.18 installed, 20.19+ required). This was present before plan execution. TypeScript check (`tsc -b`) passes cleanly. Deferred as out-of-scope environment issue.

## User Setup Required

**The three RPC functions must be applied to Supabase manually** before the TypeScript client changes in plan 01-02 will work:

1. Open Supabase project SQL editor
2. Copy the three `CREATE OR REPLACE FUNCTION` blocks from `supabase/schema.sql` (lines 409–620)
3. Run in SQL editor
4. Verify: `SELECT proname FROM pg_proc WHERE proname IN ('accept_open_challenge', 'accept_targeted_challenge', 'start_tournament');` — should return 3 rows

(No environment variables or dashboard configuration required.)

## Next Phase Readiness
- All three RPC functions are defined in `supabase/schema.sql` and ready to be applied to Supabase
- Plan 01-02 can now implement TypeScript client changes calling `supabase.rpc('accept_open_challenge', ...)`, `supabase.rpc('accept_targeted_challenge', ...)`, and `supabase.rpc('start_tournament', ...)`
- Error handling pattern established: check `error.hint === 'already_accepted'` / `'already_started'` / `'unauthorized'`

---
*Phase: 01-race-condition-fix*
*Completed: 2026-03-30*
