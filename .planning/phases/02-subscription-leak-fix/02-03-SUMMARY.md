---
phase: 02-subscription-leak-fix
plan: 03
subsystem: ui
tags: [react, supabase, realtime, typescript, subscription-cleanup]

# Dependency graph
requires:
  - phase: 02-subscription-leak-fix
    provides: Context on subscription leak patterns and removeChannel pattern
provides:
  - App.tsx global notification channel uses supabase.removeChannel in both cleanup paths
  - RealtimeChannel type used for channelRef (no `any`)
affects: [subscription management, realtime channels, App lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Both early-exit (!user) and useEffect return cleanup paths must use supabase.removeChannel + null ref"
    - "channelRef typed as RealtimeChannel | null — never any"
    - "Auth subscription.unsubscribe() is distinct from realtime channel cleanup — must not be confused"

key-files:
  created: []
  modified:
    - src/App.tsx

key-decisions:
  - "Use supabase.removeChannel(channelRef.current) + channelRef.current = null in BOTH cleanup paths to fully deregister from Supabase client registry"
  - "RealtimeChannel import from @supabase/supabase-js tightens channelRef type from any to RealtimeChannel | null"
  - "Auth listener subscription.unsubscribe() (onAuthStateChange) is NOT a realtime channel and must not be changed"

patterns-established:
  - "Global channels in App-level effects: always guard with if (channelRef.current), call removeChannel, then null the ref"

requirements-completed: [BUG-02]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 02 Plan 03: Subscription Leak Fix (App.tsx Global Notification Channel) Summary

**App.tsx global notification channel fully deregistered via supabase.removeChannel in both the early-exit and useEffect return cleanup paths, with channelRef typed as RealtimeChannel | null**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T17:20:48Z
- **Completed:** 2026-03-30T17:25:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Both cleanup paths in App.tsx (early-exit when !user, and useEffect return on unmount/user change) now use `supabase.removeChannel(channelRef.current)` with null guard and `channelRef.current = null`
- `channelRef` tightened from `useRef<any>(null)` to `useRef<RealtimeChannel | null>(null)`
- Auth listener `subscription.unsubscribe()` (line 47) left completely untouched
- No orphaned notification channel can accumulate across login/logout cycles

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix App.tsx notification channel cleanup (both paths)** - `b008e38` (fix)

**Plan metadata:** (created after prior phases — see below)

## Files Created/Modified
- `src/App.tsx` - Both cleanup paths updated to use `supabase.removeChannel` + null ref, channelRef typed as `RealtimeChannel | null`

## Decisions Made
- Used `supabase.removeChannel(channelRef.current)` instead of `channelRef.current?.unsubscribe()` — the former fully removes the channel from the Supabase client's internal registry, preventing accumulation across login/logout cycles
- Null-guarded the call (explicit `if (channelRef.current)` check) rather than optional chaining, consistent with the pattern established in GamePage and LobbyPage
- Auth listener cleanup (`subscription.unsubscribe()` at line 47) is the Supabase Auth state listener — completely unrelated to realtime channels — left untouched

## Deviations from Plan

None - plan executed exactly as written. The fix was already applied in commit b008e38 (fix(02-03): fix notification channel cleanup using removeChannel in both paths).

## Issues Encountered

None. TypeScript compilation passes with zero errors (`npx tsc --noEmit`). The `npm run build` command fails in this environment due to a pre-existing rolldown native binding issue (`MODULE_NOT_FOUND` for rolldown's native `.node` binding), which is unrelated to the code changes and was present before this plan.

## Known Stubs

None.

## Next Phase Readiness
- All three subscription leak fixes are complete: GamePage, LobbyPage, and App.tsx global notification channel
- Phase 02 (Subscription Leak Fix) is fully complete
- Ready to proceed to Phase 03 (Auth Security Fix)

---
*Phase: 02-subscription-leak-fix*
*Completed: 2026-03-30*
