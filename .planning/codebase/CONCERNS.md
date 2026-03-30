# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

**Extensive use of `as any` type assertions:**
- Issue: Type safety bypassed throughout codebase, causing potential runtime errors and making refactoring unsafe
- Files: `src/App.tsx:65`, `src/stores/gameStore.ts:27`, `src/pages/GroupPage.tsx:157,167,180`, `src/pages/LobbyPage.tsx:128,180`, `src/components/game/CategorySelector.tsx:11`, `src/pages/TournamentPage.tsx:93`
- Impact: IDE cannot catch type errors; refactoring risks breaking features; data shape assumptions not validated
- Fix approach: Replace with proper TypeScript interfaces. Extract `questionsData` typing into `src/types/index.ts`, create proper generic types for Supabase responses

**Unhandled `.single()` queries without error validation:**
- Issue: 20+ `.single()` queries in codebase have no error handling for cases where data doesn't exist or multiple records match
- Files: `src/stores/authStore.ts:41,90,110`, `src/stores/gameStore.ts:68,111,133`, `src/pages/ChallengePage.tsx:77,147,189`, `src/pages/TournamentPage.tsx:59,113`, `src/pages/LobbyPage.tsx:29,54`, `src/pages/GroupPage.tsx:64`, `src/components/game/GameChat.tsx:45`
- Impact: Silent failures when records missing; undefined behavior on constraint violations; unpredictable UI state
- Fix approach: Check for error on each `.single()` call; provide fallback handling; add defensive assertions

**Overly broad error handling with `catch (err: any)`:**
- Issue: 8+ catch blocks use `any` type, then directly access `.message` without validation
- Files: `src/pages/ChallengePage.tsx:112,168`, `src/pages/TournamentPage.tsx:73`, `src/pages/GroupPage.tsx:81`, `src/pages/LearnPage.tsx:33`, `src/pages/LoginPage.tsx:48`
- Impact: Crashes if error object structure differs; generic alert() messages don't help debugging; no error logging
- Fix approach: Create error handler utility `src/lib/errorHandler.ts`; normalize error responses; log to monitoring service

**Questions data loaded statically and shuffled on each session:**
- Issue: `questionsData` imported directly in `gameStore.ts:4` and reshuffled client-side every time a game loads
- Files: `src/stores/gameStore.ts:26-36`, `src/data/questions.json`
- Impact: No validation that questions exist; same questions can be selected multiple times across sessions; no difficulty balancing; poor scalability
- Fix approach: Move question selection to backend; validate question availability; implement proper seeding; add caching layer

## Known Bugs

**Race condition in challenge acceptance:**
- Symptoms: Two players can accept same open challenge simultaneously, creating duplicate game sessions
- Files: `src/pages/ChallengePage.tsx:175-209` (joinOpenChallenge), `src/pages/TournamentPage.tsx:93-136` (startTournament)
- Trigger: Open challenge, two players click "Mitspielen" within same second
- Workaround: None; both get session IDs but only one can play
- Fix: Add database constraint on challenges table; require atomic transaction to check+update status

**Missing validation on category selection:**
- Symptoms: Invalid category names can be sent to database; questionsData throws silently returning empty array
- Files: `src/stores/gameStore.ts:27` (if (!catData) return []), `src/components/game/CategorySelector.tsx:11`
- Trigger: Direct API call or corrupted store state
- Workaround: UI hides invalid categories, but backend allows any string
- Fix: Create enum for categories; validate in both client and server; add server-side constraints

**Real-time subscription leaks on rapid navigation:**
- Symptoms: Multiple channel subscriptions accumulate when user quickly navigates between pages
- Files: `src/pages/ChallengePage.tsx:54-61`, `src/pages/TournamentPage.tsx:37-41`, `src/pages/LobbyPage.tsx:72-87`, `src/pages/GamePage.tsx:34-48`
- Trigger: Navigate between Challenge/Tournament/Lobby/Game rapidly
- Workaround: Browser memory gradually fills; eventually causes slowdown
- Fix: Ensure cleanup runs synchronously; add cleanup tracking; use ref cleanup pattern consistently

## Security Considerations

**Client-side username-to-email conversion exposes auth mechanism:**
- Risk: `usernameToEmail()` is deterministic (`username@lernapp.local`), so attackers can enumerate valid usernames via auth attempts
- Files: `src/lib/supabase.ts:19-20`, `src/stores/authStore.ts:24,45`
- Current mitigation: None
- Recommendations:
  - Move email generation to backend during registration
  - Use random email addresses or UUIDs on server
  - Rate-limit auth endpoint
  - Add CAPTCHA to login/register forms

**No input sanitization on chat/notifications:**
- Risk: Messages and notification content rendered directly into DOM; XSS attack vector if backend doesn't sanitize
- Files: `src/components/game/GameChat.tsx` (renders content), `src/stores/notificationStore.ts` (stores arbitrary data)
- Current mitigation: React escapes content by default, but only if data is treated as text
- Recommendations:
  - Validate message length (<500 chars)
  - Strip HTML tags on client and server
  - Use Content-Security-Policy headers
  - Add unit tests for injection attempts

**Admin actions lack confirmation on destructive operations:**
- Risk: `deleteUser()` uses confirm(), but could be bypassed with browser dev tools; no audit trail
- Files: `src/pages/AdminPage.tsx:66-71` (deleteUser), `src/pages/AdminPage.tsx:73-80` (resetScore)
- Current mitigation: Browser dialog only
- Recommendations:
  - Add second-factor confirmation via email
  - Log all admin actions to database with timestamp
  - Implement soft deletes instead of hard deletes
  - Add role-based access control (RBAC)

**Supabase anon key exposed in environment:**
- Risk: Anon key is public by design, but combined with no RLS validation visible in code, trust is implicit
- Files: `src/lib/supabase.ts:4`
- Current mitigation: Supabase RLS policies (not shown, assumed to exist)
- Recommendations:
  - Verify RLS policies are enabled on all tables
  - Use session_id isolation in game_players queries
  - Never trust client-provided user_id
  - Add server-side validation for all mutations

## Performance Bottlenecks

**Inefficient real-time scoreboard updates:**
- Problem: `GamePage` subscribes to all game_players changes, even for unrelated sessions
- Files: `src/pages/GamePage.tsx:34-48`, `src/pages/LobbyPage.tsx:72-87`
- Cause: Filter is correct, but state update causes full component re-render; no memoization
- Improvement path:
  - Add useCallback to prevent re-renders
  - Implement React.memo for Scoreboard
  - Use local state diffs instead of full replacement
  - Consider Supabase channels with select_options

**Question shuffling on every session creation:**
- Problem: Large JSON with 100+ questions shuffled client-side on every game
- Files: `src/stores/gameStore.ts:26-36`
- Cause: `Math.random() - 0.5` sort is O(n log n) with poor randomness; happens on page load
- Improvement path:
  - Move shuffling to backend
  - Use seeded PRNG for deterministic shuffling
  - Cache shuffled questions by category
  - Implement pagination for large question sets

**N+1 queries in tournament loading:**
- Problem: `startTournament()` loops over participants and inserts them one-by-one
- Files: `src/pages/TournamentPage.tsx:122-132` (for loop with insert)
- Cause: No batch insert; creates N separate database operations
- Improvement path:
  - Use batch insert: `insert([...participants])`
  - Move logic to database trigger or RPC function
  - Pre-compute game pairings server-side

**Heartbeat updates every user every 30s:**
- Problem: `App.tsx:77` updates is_online + last_seen for every user every 30 seconds
- Files: `src/App.tsx:70-77`
- Cause: Not batched; at 1000 users = 1000 queries/30s = 33 req/s
- Improvement path:
  - Batch all user heartbeats into single SQL statement
  - Increase heartbeat interval (60s or 120s)
  - Use Redis for session management instead of polling
  - Add connection pooling limits

## Fragile Areas

**Category system hardcoded and unvalidated:**
- Files: `src/data/questions.json` (categories defined here), `src/components/game/CategorySelector.tsx`, `src/stores/gameStore.ts:27`
- Why fragile: Categories must match exactly; no validation; game breaks silently if category missing; adding category requires code changes
- Safe modification:
  - Extract categories to constants in `src/lib/constants.ts`
  - Create admin UI to add/remove categories
  - Store category list in database
  - Validate selection against allowed list
- Test coverage: Zero tests for invalid category handling

**Game session state machine not enforced:**
- Files: `src/pages/GamePage.tsx`, `src/pages/LobbyPage.tsx`, `src/stores/gameStore.ts`
- Why fragile: Status transitions (waiting→starting→active→finished) happen in multiple places; no validation that transitions are legal; can end up in invalid states
- Safe modification:
  - Create state machine in `src/lib/gameStateMachine.ts`
  - Validate all transitions before updating
  - Log illegal transitions as errors
  - Add FSM tests
- Test coverage: No state validation tests

**Challenge and tournament logic tightly coupled:**
- Files: `src/pages/ChallengePage.tsx` (creates game_sessions), `src/pages/TournamentPage.tsx` (creates game_sessions), `src/pages/GroupPage.tsx` (creates game_sessions)
- Why fragile: Same game creation logic duplicated 3 places; bug fixes don't propagate; session creation rules differ slightly per mode
- Safe modification:
  - Extract to `src/lib/gameSessionFactory.ts`
  - Single source of truth for session creation
  - Validate rules in factory
- Test coverage: Zero tests on game creation

**Real-time notification system uses bare `any` types:**
- Files: `src/App.tsx:65` (addNotification payload.new as any), `src/stores/notificationStore.ts`
- Why fragile: Notification data shape is unchecked; adding new notification types doesn't catch missing fields; silent failures if schema changes
- Safe modification:
  - Create discriminated union type for notifications
  - Validate payload structure on receipt
  - Type guards for each notification type
- Test coverage: No notification type validation

## Scaling Limits

**Questions stored in JSON bundle:**
- Current capacity: ~100 questions per category; bundle size grows with each question added
- Limit: Bundle becomes >1MB with 500+ questions per category; all questions loaded on client start
- Scaling path:
  - Move questions to Supabase `questions` table
  - Lazy-load by category
  - Add pagination (load 10 at a time)
  - Use search/filter on backend
  - Cache with service worker

**Supabase realtime subscriptions unbounded:**
- Current capacity: Single user can create unlimited subscriptions (one per page visit/rapid navigate)
- Limit: Supabase realtime has rate limits (~1000 messages/sec per project); subscriptions accumulate in memory
- Scaling path:
  - Implement subscription manager class to prevent duplicates
  - Track open subscriptions in store
  - Explicit cleanup on route change
  - Use single multiplexed channel per resource type
  - Add metrics/monitoring

**No database query result limits:**
- Current capacity: Pages like AdminPage load all users; LobbyPage loads all players
- Limit: >10k users causes slow load/memory issues
- Scaling path:
  - Implement pagination with .limit() and .offset()
  - Add result count limits
  - Use cursor-based pagination for large datasets
  - Add indexes on common query fields

**Tournament bracket calculation not designed for >8 players:**
- Current capacity: Max players = 8 (arbitrary)
- Limit: Code only handles single round; multi-round logic incomplete
- Scaling path:
  - Implement proper tournament bracket algorithm
  - Support Swiss system or double-elimination
  - Move bracket logic to backend RPC function
  - Add tournament simulation tests

## Dependencies at Risk

**Supabase JS client v2.100.1:**
- Risk: Security/stability fixes may lag if client not actively maintained; custom email auth is non-standard
- Impact: Auth breaks with Supabase API changes; dependencies become incompatible
- Migration plan: Monitor Supabase releases; consider migrating to NextAuth.js if email auth needs change

**Zustand store without persistence:**
- Risk: Game state lost on page refresh; no clear recovery mechanism
- Impact: Player loses progress; tournament state inconsistent across tabs
- Migration plan: Add localStorage persistence with `zustand/middleware`; validate persisted data on load

**No error boundary or fallback UI:**
- Risk: Single component error crashes entire app
- Impact: All users lose access; no graceful degradation
- Migration plan: Add React Error Boundary in `src/components/ErrorBoundary.tsx`; wrap routes; add error logging

## Missing Critical Features

**No data validation layer:**
- Problem: All user input trusts Supabase response shape; no runtime validation
- Blocks: Can't add new fields to types without breaking; can't detect data corruption; unsafe refactoring
- Recommendation: Add runtime validation with Zod or io-ts; validate all API responses

**No offline support:**
- Problem: App requires constant connection; network loss = frozen UI
- Blocks: Playing on unreliable connection; tournaments on unstable networks; mobile app expansion
- Recommendation: Add service worker; queue actions while offline; sync when restored

**No logging or monitoring:**
- Problem: No error tracking; can't diagnose why games fail; no metrics on user behavior
- Blocks: Can't debug production issues; can't measure feature impact; security events unlogged
- Recommendation: Add Sentry for error tracking; add PostHog for analytics; add custom logging

**No data backup or recovery:**
- Problem: No export of player progress; data loss = permanent
- Blocks: GDPR compliance; user support; fraud recovery
- Recommendation: Add database backups; export player data endpoint; audit trail for admin actions

## Test Coverage Gaps

**Zero test coverage across entire codebase:**
- What's not tested:
  - Auth flows (login/register/logout)
  - Game mechanics (answer submission, scoring, time up)
  - Challenge/tournament creation and joining
  - Real-time subscriptions
  - Admin panel operations
- Files: All files in `src/`
- Risk: Regressions go undetected; refactoring breaks features silently; confidence in changes is low
- Priority: **High** - Add Jest/Vitest with at minimum:
  - Auth store tests (login/register/errors)
  - Game store tests (shuffling, scoring, state transitions)
  - Component integration tests (Challenge page challenge flow)
  - Real-time integration tests (subscription setup/cleanup)
  - Admin tests (user deletion, permission checks)

**No type-level tests:**
- What's not tested: TypeScript compiler catches `any` safely; no tests for type guards
- Risk: `as any` bypasses compiler checks; no detection of invalid casts
- Priority: **Medium** - Add type assertions tests; use strict TypeScript settings

**No E2E test framework:**
- What's not tested: Full user flows (register→join game→submit answer→see results)
- Risk: UI bugs, routing errors, integration issues go undetected
- Priority: **Medium** - Add Playwright/Cypress; cover critical paths (auth, game flow, tournament)

---

*Concerns audit: 2026-03-30*
