---
phase: 01-race-condition-fix
plan: 02
subsystem: frontend
tags: [typescript, react, supabase-rpc, race-condition, challenge, tournament, error-handling]

# Dependency graph
requires:
  - "01-01: accept_open_challenge, accept_targeted_challenge, start_tournament RPC functions in schema.sql"
provides:
  - "ChallengePage.joinOpenChallenge uses supabase.rpc('accept_open_challenge') — atomic open challenge claim"
  - "ChallengePage.respondToChallenge accept path uses supabase.rpc('accept_targeted_challenge') — atomic targeted challenge claim"
  - "TournamentPage.startTournament uses supabase.rpc('start_tournament') — atomic tournament start"
  - "Race condition error handling: error.hint === 'already_accepted' / 'already_started' with German user messages"
affects:
  - "Game session creation flow — no longer produces orphaned sessions on concurrent accept"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "supabase.rpc('function_name', params) — single atomic call replacing multi-step client sequences"
    - "error.hint discriminator check — 'already_accepted' / 'already_started' / 'unauthorized'"
    - "fetchChallenges() / fetchTournaments() called after race condition error to refresh stale UI"

key-files:
  created: []
  modified:
    - src/pages/ChallengePage.tsx
    - src/pages/TournamentPage.tsx

key-decisions:
  - "joinOpenChallenge: setLoading(true/false) added around RPC call (was missing before — UX improvement)"
  - "respondToChallenge: alert() replaced with setError() for consistent error display pattern"
  - "TournamentPage.startTournament: kept alert() for errors (consistent with rest of TournamentPage which uses alert throughout)"
  - "startTournament parameter type changed from 'any' to 'Tournament & { participants: TournamentParticipant[] }' for type safety"

requirements-completed: [BUG-01]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 01 Plan 02: Client-Side Integration Summary

**Three racy multi-step Supabase flows replaced with single atomic RPC calls, with structured race-condition error handling using error.hint discrimination and German user messages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T11:08:05Z
- **Completed:** 2026-03-30T11:09:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `joinOpenChallenge`: replaced 3 separate Supabase calls (insert game_session, update challenge status+challenged_id, insert notification) with a single `supabase.rpc('accept_open_challenge')` call
- `respondToChallenge` accept path: replaced 3 separate Supabase calls (insert game_session, update challenge status+session_id, insert notification) with a single `supabase.rpc('accept_targeted_challenge')` call; decline path unchanged
- `startTournament`: replaced 4 separate Supabase calls (insert game_session, update tournament status/started_at/current_round, loop insert game_players per participant, navigate) with a single `supabase.rpc('start_tournament')` call
- Race condition errors handled: `error.hint === 'already_accepted'` in ChallengePage (both open and targeted), `error.hint === 'already_started'` in TournamentPage, both with German user-facing messages and immediate list refresh

## Task Commits

Each task committed atomically:

1. **Task 1: Replace joinOpenChallenge and respondToChallenge with atomic RPC calls** - `688e770` (feat)
2. **Task 2: Replace startTournament with atomic RPC call** - `8291c85` (feat)

## Files Created/Modified

- `src/pages/ChallengePage.tsx` — `joinOpenChallenge` and `respondToChallenge` accept path replaced with RPC calls + error.hint handling
- `src/pages/TournamentPage.tsx` — `startTournament` replaced with RPC call + error.hint handling + loading state + typed parameter

## Decisions Made

- `joinOpenChallenge` had no `setLoading` call before — added `setLoading(true/false)` as a correctness fix (Rule 2: missing critical functionality)
- `respondToChallenge` used `alert(err.message)` on error — replaced with `setError()` for consistent inline error display
- `startTournament` keeps `alert()` for errors to match the rest of `TournamentPage` which uses `alert()` throughout (alert replacement deferred to Phase 4 per plan note)
- Parameter type of `startTournament` fixed from `any` to `Tournament & { participants: TournamentParticipant[] }` for TypeScript safety
- `npm run build` fails due to pre-existing Node.js 20.18 vs required 20.19+ environment issue (rolldown native binding missing) — unrelated to this plan's changes; `tsc --noEmit` passes cleanly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Added setLoading state to joinOpenChallenge**
- **Found during:** Task 1
- **Issue:** Original `joinOpenChallenge` had no `setLoading(true/false)` wrapping, so the button showed no loading state while the RPC was in flight — the new RPC pattern needed consistent loading state
- **Fix:** Added `setLoading(true)` before and `setLoading(false)` after the `supabase.rpc()` call
- **Files modified:** `src/pages/ChallengePage.tsx`
- **Commit:** `688e770`

## Verification Results

All plan verification checks passed:

- `supabase.rpc('accept_open_challenge'` present in ChallengePage.tsx (line 173)
- `supabase.rpc('accept_targeted_challenge'` present in ChallengePage.tsx (line 137)
- `supabase.rpc('start_tournament'` present in TournamentPage.tsx (line 102)
- `from('game_sessions').insert` count in ChallengePage.tsx: **0** (no more direct inserts)
- `from('game_sessions').insert` count in TournamentPage.tsx: **0** (no more direct inserts)
- `error.hint` check count in ChallengePage.tsx: **4** (open challenge: already_accepted + unauthorized; targeted: already_accepted + unauthorized)
- `error.hint` check count in TournamentPage.tsx: **2** (already_started + unauthorized)
- `tsc --noEmit`: **zero errors**

## User Setup Required

**The RPC functions must be applied to the live Supabase database before these client changes are functional.** See Plan 01-01 SUMMARY for exact SQL to run in the Supabase SQL Editor (lines 409-620 of supabase/schema.sql).

---
*Phase: 01-race-condition-fix*
*Completed: 2026-03-30*
