# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5.9.3 - Frontend application, type-safe development
- HTML5 - Document structure in `index.html`
- CSS - Styling via Tailwind CSS

**Secondary:**
- SQL (PL/pgSQL) - Supabase database functions and procedures in `supabase/schema.sql`
- JSON - Question data in `src/data/questions.json`

## Runtime

**Environment:**
- Node.js (npm-based, version specified in package-lock.json)

**Package Manager:**
- npm (v8+, inferred from lock file)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.2.4 - UI framework
  - React DOM 19.2.4 - DOM rendering
  - React Router DOM 7.13.2 - Client-side routing (BrowserRouter in `src/App.tsx`)

**State Management:**
- Zustand 5.0.12 - Global state management
  - `src/stores/authStore.ts` - Authentication state
  - `src/stores/gameStore.ts` - Game session and question state
  - `src/stores/notificationStore.ts` - Notification state

**Styling:**
- Tailwind CSS 4.2.2 - Utility-first CSS framework
- Tailwind Merge 3.5.0 - Merge Tailwind CSS classnames
- Autoprefixer 10.4.27 - CSS vendor prefixing
- PostCSS 8.5.8 - CSS transformation pipeline

**Icons:**
- Lucide React 1.7.0 - SVG icon library for React components

**Date/Time:**
- date-fns 4.1.0 - Date manipulation and formatting

**Utilities:**
- clsx 2.1.1 - Dynamic classname generation

**Build/Dev:**
- Vite 8.0.1 - Frontend build tool and dev server
  - @vitejs/plugin-react 6.0.1 - React Fast Refresh plugin
  - @tailwindcss/vite 4.2.2 - Tailwind CSS integration
- TypeScript 5.9.3 - Type checking (tsc -b)
- ESLint 9.39.4 - Code linting
  - @eslint/js 9.39.4 - ESLint core rules
  - typescript-eslint 8.57.0 - TypeScript support
  - eslint-plugin-react-hooks 7.0.1 - React hooks linting
  - eslint-plugin-react-refresh 0.5.2 - React Fast Refresh linting
  - globals 17.4.0 - Global constants

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.100.1 - Supabase client SDK for authentication, database, and real-time subscriptions
  - Handles Auth (signUp, signIn, signOut)
  - Database CRUD operations via `.from()` interface
  - Real-time subscriptions via PostgreSQL Changes
  - RPC calls to stored procedures

**Infrastructure:**
- @tanstack/react-query 5.95.2 - (Listed but not actively used in current codebase for data fetching; direct Supabase calls are used instead)

## Configuration

**Environment:**
- `.env.example` - Template for environment variables
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous API key
- Vite environment variables loaded via `import.meta.env.VITE_*` in `src/lib/supabase.ts`

**Build:**
- `vite.config.ts` - Vite configuration with React and Tailwind plugins
  - Path alias: `@` resolves to `./src`
- `tsconfig.json` - TypeScript configuration root (references app and node configs)
- `tsconfig.app.json` - Application TypeScript settings
  - Target: ES2023
  - Module: ESNext
  - Strict mode enabled
  - Path aliases configured
- `tsconfig.node.json` - Node/build tool TypeScript settings
- `eslint.config.js` - ESLint configuration (flat config format)

## Platform Requirements

**Development:**
- Node.js 18+ (inferred from TypeScript 5.9 and Vite 8 requirements)
- npm or yarn package manager
- Modern browser with ES2023 support

**Production:**
- Node.js 18+ for build pipeline
- Modern browser with ES2023 support
- Supabase project and credentials required for runtime

---

*Stack analysis: 2026-03-30*
