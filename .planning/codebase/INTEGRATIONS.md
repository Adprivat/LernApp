# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**Learning Platform Backend:**
- Supabase - Complete backend-as-a-service platform
  - SDK: @supabase/supabase-js (v2.100.1)
  - URL: Configured via `VITE_SUPABASE_URL` environment variable
  - Auth Key: Configured via `VITE_SUPABASE_ANON_KEY` environment variable
  - Client instantiated in `src/lib/supabase.ts`

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: Via Supabase client using URL and anonymous key
  - Client: @supabase/supabase-js JavaScript client
  - Schema defined in `supabase/schema.sql`
  - Primary tables:
    - `profiles` - User profiles with game statistics
    - `game_sessions` - Game session records (solo, challenge, group, tournament modes)
    - `game_players` - Player participation in sessions with scores
    - `game_answers` - Individual answer tracking with timing and points
    - `challenges` - Challenge invitations between players
    - `tournaments` - Tournament definitions and state
    - `tournament_participants` - Tournament participant tracking
    - `achievements` - Achievement definitions
    - `user_achievements` - User achievement progress
    - `chat_messages` - In-game chat messages
    - `notifications` - User notifications (challenges, achievements, game invites)

**File Storage:**
- Local filesystem only - No cloud file storage configured
- Question data stored in `src/data/questions.json`
- Avatar URLs stored as text references in `profiles.avatar_url` field

**Caching:**
- None detected - Direct Supabase queries without caching layer
- @tanstack/react-query dependency present but not utilized

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in PostgreSQL auth)
  - Implementation: Custom email/password authentication
  - Username converted to email via `usernameToEmail()` function in `src/lib/supabase.ts`
    - Pattern: `{username}@lernapp.local`
  - Auth managed in `src/stores/authStore.ts`:
    - `signUp()` - Register new user and create profile
    - `signIn()` - Authenticate with email/password
    - `signOut()` - Logout and mark offline
    - `getUser()` - Fetch authenticated user
    - `onAuthStateChange()` - Subscribe to auth events in `src/App.tsx`
  - Session persistence: Enabled via Supabase client configuration
  - Token auto-refresh: Enabled

## Monitoring & Observability

**Error Tracking:**
- None detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Browser console only (console.error/console.log)
- No centralized logging service configured

## CI/CD & Deployment

**Hosting:**
- Not configured - Static build artifact ready for deployment
- Build output: `dist/` directory (created by Vite)

**CI Pipeline:**
- None detected - No GitHub Actions, GitLab CI, or similar workflow files

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project API URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous public key for client-side access

**Secrets location:**
- `.env` file (created locally from `.env.example`)
- Environment variables loaded at build time via Vite's `import.meta.env`

## Webhooks & Callbacks

**Incoming:**
- None - No incoming webhook endpoints configured in this frontend application

**Outgoing:**
- Game session callbacks tracked via Supabase real-time subscriptions in `src/App.tsx`:
  - `user_notifs:{userId}` channel for notification INSERT events
  - Real-time postgres_changes on `notifications` table
- In-game chat broadcast via Supabase real-time for multiplayer coordination
- Challenge and tournament updates via real-time table subscriptions

## Real-time Communication

**Supabase Realtime (PostgreSQL Changes):**
- Connection configured in `src/lib/supabase.ts` with:
  - `eventsPerSecond: 10` - Rate limiting for events
  - `persistSession: true` - Persist authentication
  - `autoRefreshToken: true` - Automatic token refresh

**Real-time Subscriptions:**
- Notification listener in `src/App.tsx` (line 57-67):
  - Monitors `notifications` table for INSERT events matching current user
  - Triggers `addNotification()` store action on new notification

- Realtime table publications enabled in database schema:
  - `public.notifications`
  - `public.challenges`
  - `public.game_sessions`
  - `public.game_players`
  - `public.chat_messages`
  - `public.tournaments`
  - `public.tournament_participants`

## Database Functions (RPC)

**User-defined functions in Supabase:**

**`update_player_stats(p_user_id, p_score, p_won, p_correct)`**
- Location: `supabase/schema.sql` (lines 311-352)
- Purpose: Update player profile statistics after game completion
- Called from: `src/stores/gameStore.ts` line 232 via `supabase.rpc()`
- Operations:
  - Increments total_score
  - Increments games_played
  - Increments games_won (if won)
  - Updates current_streak (resets to 0 on loss, increments on win)
  - Updates best_streak (tracks longest winning streak)
  - Triggers `check_achievements()` to award achievements

**`check_achievements(p_user_id)`**
- Location: `supabase/schema.sql` (lines 357-407)
- Purpose: Check and award achievements based on profile statistics
- Checks achievements:
  - `first_game` - Play 1 game
  - `games_10`, `games_50`, `games_100` - Play N games
  - `first_win`, `wins_10`, `wins_50` - Win N games
  - `score_1000`, `score_5000`, `score_10000` - Earn N points
  - `streak_3`, `streak_5`, `streak_10` - Achieve N-game win streaks
- Actions on unlock:
  - Inserts record into `user_achievements`
  - Creates notification of type `achievement_earned`

## Data Synchronization

**Game Answer Submission Flow:**
1. User submits answer in game (`src/stores/gameStore.ts` line 153)
2. Answer inserted into `game_answers` table with correct/incorrect flag and points
3. Player score updated in `game_players` table
4. On game end: `update_player_stats()` RPC called to update profile statistics
5. Achievement check triggered automatically by `update_player_stats()`
6. Notification generated if achievement unlocked

**Online Status Tracking:**
- Heartbeat interval in `src/App.tsx` (line 77): Every 30 seconds
- Updates `profiles.is_online = true` and `profiles.last_seen` timestamp
- Logout updates `profiles.is_online = false`

---

*Integration audit: 2026-03-30*
