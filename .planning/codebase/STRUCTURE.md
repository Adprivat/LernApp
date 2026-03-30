# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
LernApp/
├── src/
│   ├── components/           # Reusable UI components organized by feature
│   │   ├── game/            # Game-specific components (questions, scoreboard, chat)
│   │   ├── layout/          # Layout components (navigation bar)
│   │   ├── notifications/   # Notification UI component
│   │   ├── ui/              # Primitive UI components (Button, Card, Input, Modal, etc.)
│   │   ├── App.css          # App-level styles
│   │   └── App.tsx          # Root app component with routing and global effects
│   ├── data/
│   │   └── questions.json   # Question data by category with answers and metadata
│   ├── lib/
│   │   └── supabase.ts      # Supabase client initialization and helpers
│   ├── pages/               # Page components, one per route
│   │   ├── AdminPage.tsx
│   │   ├── ChallengePage.tsx
│   │   ├── GamePage.tsx
│   │   ├── GroupPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   ├── LearnPage.tsx
│   │   ├── LobbyPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── TournamentPage.tsx
│   ├── stores/              # Zustand state stores
│   │   ├── authStore.ts     # Authentication and user profile state
│   │   ├── gameStore.ts     # Game session and gameplay state
│   │   └── notificationStore.ts  # Notifications state
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces for all domain entities
│   ├── index.css            # Global CSS and Tailwind imports
│   └── main.tsx             # React app entry point
├── public/                  # Static assets served by Vite
│   ├── favicon.svg
│   └── icons.svg
├── supabase/                # Supabase project configuration and migrations
├── .claude/                 # Claude tooling configuration (GSD workflows)
├── .planning/
│   └── codebase/            # Codebase analysis documents
├── package.json             # NPM dependencies and scripts
├── tsconfig.json            # TypeScript references config
├── tsconfig.app.json        # TypeScript app compilation config
├── tsconfig.node.json       # TypeScript build tools config
├── vite.config.ts           # Vite build configuration with path aliases
├── eslint.config.js         # ESLint rules configuration
└── eslintignore (implicit)  # ESLint ignore patterns
```

## Directory Purposes

**src/components:**
- Purpose: Reusable React components organized by feature/domain
- Contains: Game UI (question display, scoreboard, chat), layout (navbar), notifications, primitive UI components
- Key files: Button, Card, Input, Modal, Avatar, Badge templates for consistent styling
- Naming: Components are PascalCase (e.g., QuestionCard.tsx)

**src/components/ui:**
- Purpose: Primitive, reusable UI components with Tailwind styling
- Contains: Form inputs, buttons, cards, modals, avatars, badges
- Key files: `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx`, `Avatar.tsx`, `Badge.tsx`
- Pattern: Each file exports single named component with variant props (primary/secondary, size variants)

**src/components/game:**
- Purpose: Game-specific UI components used during gameplay
- Contains: QuestionCard (with timer), Scoreboard, GameResultScreen, GameChat, CategorySelector
- Key files: `QuestionCard.tsx` (timer and answer selection logic), `Scoreboard.tsx` (player rankings)
- Pattern: Props include callbacks for user actions (onAnswer, onTimeUp)

**src/components/layout:**
- Purpose: Page layout components used across routes
- Contains: Navbar with navigation, user info, notifications
- Key files: `Navbar.tsx`
- Pattern: Components that stay persistent while pages swap

**src/components/notifications:**
- Purpose: Notification UI and management
- Contains: NotificationPanel for displaying user notifications
- Key files: `NotificationPanel.tsx`

**src/pages:**
- Purpose: Route-level components that correspond to URL paths
- Contains: One component per main route (login, home, game, challenge, etc.)
- Key files: LoginPage, HomePage, GamePage, ChallengePage, TournamentPage, LeaderboardPage, LobbyPage
- Naming: PascalCase with `Page` suffix (e.g., HomePage.tsx)
- Pattern: Pages use hooks to access stores, fetch data, manage local state, and render component trees

**src/stores:**
- Purpose: Centralize state management and async operations using Zustand
- Contains: Three independent stores for auth, game, and notifications
- Key files:
  - `authStore.ts` - user login/register/logout, profile fetching and updating
  - `gameStore.ts` - game session creation/joining, question loading, answer submission, scoring
  - `notificationStore.ts` - fetch notifications, mark as read, add new notifications
- Pattern: `create<Interface>((set, get) => ({ ...state, ...methods }))` with hooks exported

**src/types:**
- Purpose: Central TypeScript type definitions for domain models
- Contains: Interfaces for Profile, Question, GameSession, GamePlayer, GameAnswer, Challenge, Tournament, Achievement, Notification, ChatMessage, etc.
- Key files: `index.ts` (single file with all types)
- Pattern: Flat namespace, exported as named exports

**src/data:**
- Purpose: Static content used by the application
- Contains: Question data organized by category
- Key files: `questions.json` with structure: `{ categories: { [categoryKey]: { name, icon, color, questions: [...] } } }`
- Format: JSON with question objects containing question text, answer array, correct_index, difficulty level

**src/lib:**
- Purpose: Utility functions and external service initialization
- Contains: Supabase client setup, environment variable loading, helper functions
- Key files: `supabase.ts` - creates Supabase client with realtime config, exports usernameToEmail helper
- Pattern: Singleton exports for shared services

**public:**
- Purpose: Static assets served directly by Vite without processing
- Contains: favicon.svg, icons.svg
- Committed: Yes

**supabase:**
- Purpose: Supabase project configuration, migrations, and seed data
- Contains: PostgreSQL schema definitions, migration files, edge functions (if any)
- Generated: No (manually maintained)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Creates React root and renders App component
- `src/App.tsx`: Defines BrowserRouter, routes, RequireAuth wrapper, initializes auth and notifications
- `src/pages/LoginPage.tsx`: Login/register page at `/login` route

**Configuration:**
- `vite.config.ts`: Vite build config with @ path alias pointing to src/
- `tsconfig.app.json`: TypeScript compiler options (ES2023 target, module resolution)
- `tsconfig.json`: TypeScript project references
- `eslint.config.js`: ESLint rules for code style
- `package.json`: Dependencies and build scripts

**Core Logic:**
- `src/stores/authStore.ts`: User authentication state and operations
- `src/stores/gameStore.ts`: Game session management and scoring logic
- `src/lib/supabase.ts`: Database and realtime API client

**Game Flow:**
- `src/pages/GamePage.tsx`: Main game interface, question display, scoring
- `src/components/game/QuestionCard.tsx`: Question display with timer and answer selection
- `src/components/game/Scoreboard.tsx`: Player rankings and scores

**User Management:**
- `src/pages/ProfilePage.tsx`: User profile and statistics display
- `src/pages/LeaderboardPage.tsx`: Global rankings and achievements
- `src/stores/authStore.ts`: Profile fetching and updating

**Multiplayer/Social:**
- `src/pages/LobbyPage.tsx`: Waiting area before game starts
- `src/pages/ChallengePage.tsx`: 1v1 challenge creation and management
- `src/pages/GroupPage.tsx`: Group/team game setup
- `src/pages/TournamentPage.tsx`: Tournament bracket and progression

**Testing:**
- None currently - no test files exist in the project

## Naming Conventions

**Files:**
- React components: PascalCase (`QuestionCard.tsx`, `HomePage.tsx`)
- Utilities and services: camelCase (`supabase.ts`, `authStore.ts`)
- Pages: PascalCase with `Page` suffix (`GamePage.tsx`, `LoginPage.tsx`)
- Stores: camelCase with `Store` suffix (`authStore.ts`, `gameStore.ts`)
- Types: PascalCase interfaces (`Profile`, `GameSession`, `Question`)
- Data files: kebab-case or camelCase (`questions.json`)

**Directories:**
- Feature directories: plural, lowercase (`components`, `pages`, `stores`, `types`)
- Component sub-directories: feature-based, lowercase (`game`, `layout`, `ui`, `notifications`)
- No nesting beyond 3 levels

**Variables and Functions:**
- camelCase for functions and variables (`fetchProfile`, `submitAnswer`, `useAuthStore`)
- SCREAMING_SNAKE_CASE for constants (not commonly used in this project)
- Interfaces: PascalCase (`AuthState`, `GameState`, `Profile`)

## Where to Add New Code

**New Feature (e.g., achievement system):**
- Primary code: `src/pages/AchievementsPage.tsx` (or integrate into ProfilePage)
- Store logic: `src/stores/achievementStore.ts` (if needed, otherwise in related store)
- UI components: `src/components/achievements/AchievementCard.tsx`, `AchievementList.tsx`
- Types: Add new interfaces to `src/types/index.ts` (Achievement, UserAchievement)
- Route: Add to `src/App.tsx` Routes

**New Component (e.g., time-picker):**
- Implementation: `src/components/ui/TimePicker.tsx` (if primitive) or `src/components/game/TimeSelector.tsx` (if feature-specific)
- Props interface: Define in same file, extending React HTML elements where applicable
- Export: Use default export for single component per file

**New Page (e.g., settings page):**
- Implementation: `src/pages/SettingsPage.tsx`
- Route: Add to `src/App.tsx` in Routes
- Navigation: Add link in `src/components/layout/Navbar.tsx` navItems array if top-level page
- Store integration: Use existing stores or create new one if managing new domain entity

**Utilities/Helpers:**
- Shared utilities: `src/lib/utilityName.ts` (e.g., src/lib/helpers.ts for string formatting)
- API helpers: `src/lib/supabase.ts` (add new query functions as needed)

**Styling:**
- Global CSS: `src/index.css` (Tailwind imports and global classes)
- Component scoping: Use Tailwind utility classes in className attributes, clsx for conditionals
- CSS files: Only for global styles, not for component scoping

**Static Data:**
- Questions: `src/data/questions.json` (structured by category)
- Constants: Define inline in component/store or in `src/lib/constants.ts` if reused

## Special Directories

**src/components/ui:**
- Purpose: Primitive UI component library
- Generated: No
- Committed: Yes
- Pattern: Reusable styled components that multiple features use

**src/data:**
- Purpose: Static content and configuration
- Generated: Partially (questions.json is manually maintained but could be auto-generated from CMS)
- Committed: Yes

**.claude/get-shit-done:**
- Purpose: Claude workflow automation and GSD command templates
- Generated: Yes (by GSD scaffolding)
- Committed: Yes

**.planning/codebase:**
- Purpose: Generated codebase analysis documents
- Generated: Yes (by /gsd:map-codebase)
- Committed: Yes

**supabase:**
- Purpose: Database schema and migrations
- Generated: No (manually created)
- Committed: Yes

## Import Paths

**Alias:**
- `@/`: Points to `src/` directory via vite.config.ts and tsconfig.json
- Usage: `import { Button } from '@/components/ui/Button'` instead of relative paths

**Pattern - Organize imports by:**
1. External libraries (React, React Router, Zustand)
2. Internal lib/utils (`@/lib/supabase`)
3. Stores (`@/stores/authStore`)
4. Components (`@/components/...`)
5. Types (`@/types`)
6. Styles (`./component.css` or inline Tailwind)

---

*Structure analysis: 2026-03-30*
