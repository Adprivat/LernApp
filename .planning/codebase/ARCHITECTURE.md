# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Client-side React SPA with Zustand state management and Supabase real-time backend integration. MVC-like pattern with clear separation between pages, components, stores, and types.

**Key Characteristics:**
- Single Page Application (SPA) using React Router for client-side routing
- Centralized state management via Zustand stores
- Real-time synchronization with Supabase PostgreSQL backend using websocket channels
- Component-based UI architecture with UI primitives and feature-specific components
- Separation of concerns: pages handle routing/layout, components handle UI, stores handle business logic and data fetching

## Layers

**UI Layer (Presentational Components):**
- Purpose: Render user interfaces, handle local state for form inputs and temporary UI state
- Location: `src/components/`
- Contains: Reusable UI components (Button, Card, Input, Modal, Avatar, Badge), game-specific components (QuestionCard, Scoreboard, GameChat), layout components (Navbar), and feature components (NotificationPanel, CategorySelector)
- Depends on: Types (`src/types/`), stores for reading application state, Lucide icons
- Used by: Page components (`src/pages/`) and other components

**Page Layer:**
- Purpose: Orchestrate page-level logic, integrate multiple components and stores, handle routing and navigation
- Location: `src/pages/`
- Contains: Route-level components like HomePage, GamePage, LoginPage, ChallengePage, LeaderboardPage, TournamentPage, GroupPage, LobbyPage, ProfilePage, LearnPage, AdminPage
- Depends on: Components, stores, React Router, supabase client
- Used by: App.tsx routing layer

**State Management Layer (Stores):**
- Purpose: Centralize application state and async data operations
- Location: `src/stores/`
- Contains: Three Zustand stores - authStore (user authentication and profile), gameStore (game session and gameplay state), notificationStore (user notifications)
- Depends on: Supabase client (`src/lib/supabase`), types
- Used by: Pages and components for reading/updating state

**Data Access Layer:**
- Purpose: Interface with external services (Supabase) and provide helper functions
- Location: `src/lib/supabase.ts`
- Contains: Supabase client initialization, configuration, and usernameToEmail helper function
- Depends on: @supabase/supabase-js library
- Used by: All stores and some pages for direct database operations

**Types/Models Layer:**
- Purpose: Define TypeScript interfaces for all domain entities
- Location: `src/types/index.ts`
- Contains: Interfaces for Profile, Question, GameSession, GamePlayer, GameAnswer, Challenge, Tournament, TournamentParticipant, Achievement, UserAchievement, ChatMessage, Notification, QuestionData
- Depends on: None
- Used by: All layers (stores, pages, components)

**Data Layer:**
- Purpose: Store static and dynamic content
- Location: `src/data/questions.json`
- Contains: Question categories with questions, answers, correct indices, and difficulty levels
- Depends on: None
- Used by: gameStore for loading questions

**Root App Layer:**
- Purpose: Initialize application, set up routing, global effects
- Location: `src/App.tsx`, `src/main.tsx`, `src/index.css`
- Contains: BrowserRouter setup, route definitions, RequireAuth wrapper, auth state initialization, real-time notification channel subscription, online status heartbeat
- Depends on: All layers
- Used by: Browser entry point

## Data Flow

**Authentication Flow:**

1. User navigates to `/login` → LoginPage component
2. User submits form → calls `useAuthStore.login()` or `useAuthStore.register()`
3. Store makes Supabase auth request and creates/updates profile in database
4. Store updates Zustand state with user Profile
5. App.tsx useEffect watches auth state and calls `fetchProfile()` on SIGNED_IN event
6. User redirected to `/` via RequireAuth guard

**Game Session Flow:**

1. User selects mode and category on HomePage or LearnPage
2. Page component calls `useGameStore.createSoloSession()` or navigates to LobbyPage
3. Store creates GameSession and GamePlayer records in Supabase
4. Store shuffles questions from questions.json based on category
5. Page redirects to `/game/:sessionId` → GamePage
6. GamePage loads session via `loadSession()` which fetches GameSession, GamePlayers, and regenerates questions
7. QuestionCard component displays current question with timer
8. User selects answer → QuestionCard calls `onAnswer()` → GamePage calls `submitAnswer()`
9. Store calculates points (base 100 + time bonus), records answer in game_answers table
10. Store updates player score in game_players table
11. GamePage calls `nextQuestion()` to advance or `endGame()` when finished
12. Store calls update_player_stats RPC to increment profile stats

**Real-time Multiplayer Flow:**

1. Multiple users join same lobby/game session
2. GamePage subscribes to Supabase channel `game:${sessionId}` for postgres_changes on game_players table
3. When any player's game_players record updates, channel fires event
4. GamePage fetches updated players list and updates local state
5. Scoreboard component re-renders with new scores

**Notification Flow:**

1. App.tsx sets up Supabase real-time channel `user_notifs:${user.id}` on INSERT to notifications table
2. Backend or triggers create notification record
3. Channel fires INSERT event with new notification payload
4. App.tsx calls `useNotificationStore.addNotification()` with payload
5. NotificationPanel component displays unread notifications
6. User clicks notification → calls `markRead()` which updates is_read in database

**Challenge/Tournament Flow:**

1. ChallengePage or TournamentPage fetches relevant data via Supabase queries
2. Page subscribes to Supabase channels for real-time updates
3. User creates challenge/tournament → page inserts record, store updates state
4. Real-time channel fires update → page re-fetches and re-renders
5. Challenge/tournament progresses through status states (pending → accepted → completed)

**State Management:**

- Zustand stores hold all application state (user, game session, notifications)
- Stores are directly accessed via hooks in components/pages (useAuthStore, useGameStore, useNotificationStore)
- Stores perform async operations and update their state with results
- No global Redux/Context - each store is independent
- Local component state used for temporary UI state (form inputs, modals, loading states)

## Key Abstractions

**RequireAuth Wrapper:**
- Purpose: Protects routes that require authentication
- Examples: `src/App.tsx` (lines 19-30)
- Pattern: React component wrapper that checks `useAuthStore().user` and `useAuthStore().initialized`, redirects to /login if not authenticated, shows loading spinner while initializing

**Zustand Store Pattern:**
- Purpose: Centralize state and async operations for a feature
- Examples: `src/stores/authStore.ts`, `src/stores/gameStore.ts`, `src/stores/notificationStore.ts`
- Pattern: `create<StateInterface>((set, get) => ({ state, async methods }))` with hooks exported as `useXxxStore()`

**Component Props Pattern:**
- Purpose: Define clear contract between parent and child components
- Examples: `src/components/game/QuestionCard.tsx`, `src/components/ui/Button.tsx`
- Pattern: Typed interface extending React HTML elements (e.g., `ButtonProps extends React.ButtonHTMLAttributes`), spread native props (`{...props}`), use clsx for conditional classes

**Question Loading Pattern:**
- Purpose: Load and shuffle questions from static data based on category and count
- Examples: `src/stores/gameStore.ts` (shuffleQuestions function, lines 26-36)
- Pattern: Extract category from questions.json, shuffle with `sort(() => Math.random() - 0.5)`, slice to requested count

**Supabase Real-time Subscription Pattern:**
- Purpose: Keep UI synchronized with database changes
- Examples: `src/App.tsx` (lines 57-67), `src/pages/GamePage.tsx` (lines 34-49), `src/pages/ChallengePage.tsx` (lines 54-61)
- Pattern: `supabase.channel(channelName).on('postgres_changes', {...}).subscribe()`, store ref, cleanup in useEffect return, re-fetch data on change event

## Entry Points

**Root Entry:**
- Location: `src/main.tsx`
- Triggers: Browser load of index.html
- Responsibilities: Render React app into #root DOM element with StrictMode

**App Component:**
- Location: `src/App.tsx`
- Triggers: main.tsx createRoot render
- Responsibilities: BrowserRouter wrapper, initialize auth state and notifications, set up real-time channels, define route structure, RequireAuth guard

**Page Components:**
- Location: `src/pages/*.tsx`
- Triggers: React Router route match
- Responsibilities: Load data for the page, orchestrate component layout, subscribe to real-time updates, handle navigation

## Error Handling

**Strategy:** Try-catch with user-facing error messages, console logging of errors, no global error boundary currently (async errors in stores are caught)

**Patterns:**
- Store methods wrap operations in try-finally, set loading state
- Pages catch errors in try-catch blocks, set local error state, display in UI
- LoginPage catches specific error messages and translates them to user-friendly German text
- ChallengePage validation checks and error messages before creating challenge
- No error boundaries or global error handler - improvements needed

## Cross-Cutting Concerns

**Logging:** Console logging in some operations (e.g., gameStore answer submission), minimal structured logging

**Validation:**
- Frontend validation in forms (LoginPage regex for username, password length check)
- Supabase validation on database level via constraints
- Component validation (QuestionCard prevents double-submit of answers)

**Authentication:**
- Supabase Auth for user signup/signin with email/password
- Session persistence via Supabase (persistSession: true)
- Auto token refresh via Supabase (autoRefreshToken: true)
- RequireAuth wrapper guards protected routes
- Online status tracking via is_online flag with heartbeat every 30 seconds

**Real-time Synchronization:**
- Supabase Realtime API for multiplayer game synchronization
- Event-per-second rate limiting to prevent overload
- Multiple channel subscriptions (notifications, game state, challenges)
- Automatic re-fetch on change events to ensure consistency

---

*Architecture analysis: 2026-03-30*
