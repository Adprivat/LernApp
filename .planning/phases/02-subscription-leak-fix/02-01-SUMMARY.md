---
phase: 02-subscription-leak-fix
plan: 01
subsystem: realtime
tags: [supabase, realtime, react, typescript, subscription, cleanup]

# Dependency graph
requires: []
provides:
  - GamePage.tsx fully removes Supabase channel from registry on unmount via removeChannel
  - LobbyPage.tsx fully removes Supabase channel from registry on unmount via removeChannel
affects: [03-auth-security-fix, 04-error-handling-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns: [supabase.removeChannel + null ref as canonical channel cleanup pattern]

key-files:
  created: []
  modified:
    - src/pages/GamePage.tsx
    - src/pages/LobbyPage.tsx

key-decisions:
  - "Use supabase.removeChannel(channelRef.current) in both files instead of channel.unsubscribe() — fully deregisters from Supabase client registry preventing orphaned channel accumulation"
  - "Null the ref after removeChannel to prevent double-remove and allow GC"
  - "Type channelRef as RealtimeChannel | null (not any) for type safety and to enforce null guard"

patterns-established:
  - "Channel cleanup pattern: if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }"
  - "channelRef typed as useRef<RealtimeChannel | null>(null) — never useRef<any>"

requirements-completed: [BUG-02]

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 02 Plan 01: Subscription Leak Fix Summary

**Replaced channel.unsubscribe() with supabase.removeChannel() in GamePage and LobbyPage, fully deregistering Supabase realtime channels from the client registry on unmount**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T06:17:52Z
- **Completed:** 2026-03-31T06:19:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- GamePage.tsx channel cleanup now calls `supabase.removeChannel()` with null guard and nulls the ref
- LobbyPage.tsx channel cleanup now calls `supabase.removeChannel()` with null guard and nulls the ref
- Both channelRefs typed as `RealtimeChannel | null` instead of `any`
- Rapid navigation between these pages no longer accumulates orphaned channels in the Supabase RealtimeClient registry

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix GamePage.tsx channel cleanup** - `125c304` (fix)
2. **Task 2: Fix LobbyPage.tsx channel cleanup** - `a0e3499` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/pages/GamePage.tsx` - Added RealtimeChannel import, tightened channelRef type, replaced unsubscribe with removeChannel + null guard
- `src/pages/LobbyPage.tsx` - Added RealtimeChannel import, tightened channelRef type, replaced unsubscribe with removeChannel + null guard

## Decisions Made

None - followed plan as specified. The fix pattern was mechanical: import type, tighten ref type, replace cleanup function.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`npm run build` could not be verified due to a pre-existing Node.js version incompatibility (Vite requires Node 20.19+ but environment has 20.18.0). TypeScript compilation (`npx tsc --noEmit`) passes with zero errors. The build environment issue is out of scope for this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Subscription leak fix for GamePage and LobbyPage complete
- Pattern established: `supabase.removeChannel(ref.current); ref.current = null;` in useEffect cleanup
- Remaining subscription leaks noted in PROJECT.md (ChallengePage.tsx, TournamentPage.tsx) are tracked separately

## Self-Check: PASSED

- FOUND: src/pages/GamePage.tsx
- FOUND: src/pages/LobbyPage.tsx
- FOUND: commit 125c304 (Task 1)
- FOUND: commit a0e3499 (Task 2)

---
*Phase: 02-subscription-leak-fix*
*Completed: 2026-03-31*
