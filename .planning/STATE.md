---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 02-subscription-leak-fix/02-03-PLAN.md (plan 03 of 03)
last_updated: "2026-03-30T17:25:36.555Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 5
  completed_plans: 4
  percent: 50
---

# Project State

**Last updated:** 2026-03-30T11:04:47Z
**Status:** Ready to plan

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Nutzer können jederzeit stabil und sicher gegeneinander spielen — ohne Race Conditions, Memory Leaks oder Sicherheitslücken.
**Current focus:** Phase 02 — Subscription Leak Fix

## Current Phase

**Phase 1** — Race Condition Fix (Challenge)

- Status: In Progress (Plan 01 complete, Plan 02 pending)
- Current Plan: 02 of 02
- Requirements: BUG-01

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Race Condition Fix (Challenge) | ◑ In Progress |
| 2 | Subscription Leak Fix | ○ Pending |
| 3 | Auth Security Fix | ○ Pending |
| 4 | Error Handling Hardening | ○ Pending |

## Milestone

**v1.1 — Bugfix & Stabilisierung**
Progress: [█████░░░░░] 50%

## Decisions

- [01-race-condition-fix/01] Use atomic UPDATE...WHERE...RETURNING plpgsql RPC for challenge/tournament claims to eliminate race conditions
- [01-race-condition-fix/01] SECURITY DEFINER + explicit auth.uid() guard pattern required for functions that bypass RLS
- [01-race-condition-fix/01] Check error.hint (not error.code/message) to discriminate application-level race condition errors
- [01-race-condition-fix/01] Do NOT insert game_players inside challenge RPCs — defer to gameStore.joinSession() for minimal scope
- [01-race-condition-fix/01] DO insert game_players inside start_tournament — participants pre-registered, atomicity required
- [Phase 01-race-condition-fix]: Use supabase.rpc() single-call pattern for all racy multi-step client flows — eliminates race conditions at the client layer
- [Phase 01-race-condition-fix]: Discriminate RPC errors by error.hint (not error.code or error.message) — stable machine-readable key per PostgREST conventions
- [Phase 02-subscription-leak-fix]: Use useRef instead of local const for channel storage — prevents orphaned channels in Supabase registry on React StrictMode double-mount
- [Phase 02-subscription-leak-fix]: Use supabase.removeChannel + null ref in BOTH cleanup paths (early-exit and useEffect return) to fully deregister notification channel from Supabase client registry
- [Phase 02-subscription-leak-fix]: Auth listener subscription.unsubscribe() (onAuthStateChange) is distinct from realtime channel cleanup and must not be changed

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-race-condition-fix | 01 | 2min | 2 | 1 |
| Phase 01-race-condition-fix P02 | 2min | 2 tasks | 2 files |
| Phase 02-subscription-leak-fix P02 | 5min | 2 tasks | 2 files |
| Phase 02-subscription-leak-fix P03 | 5min | 1 tasks | 1 files |

## Session

- **Last session:** 2026-03-30T17:22:17.592Z
- **Stopped at:** Completed 02-subscription-leak-fix/02-03-PLAN.md (plan 03 of 03)
