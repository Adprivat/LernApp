# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- PascalCase for React components: `QuestionCard.tsx`, `GameChat.tsx`, `Button.tsx`
- camelCase for utility/service files: `supabase.ts`, `authStore.ts`, `gameStore.ts`
- Index files use `index.ts` for type exports: `src/types/index.ts`

**Functions:**
- camelCase for all functions: `handleSubmit`, `loadSession`, `submitAnswer`, `shuffleQuestions`
- Prefix with action verbs: `create*`, `fetch*`, `handle*`, `update*`, `load*`, `reset*`
- Event handlers prefixed with `handle`: `handleAnswer`, `handleSelect`, `handleSubmit`, `handleTimeUp`

**Variables:**
- camelCase for local variables and state: `sessionId`, `currentQuestion`, `gameOver`, `timeLeft`
- Boolean variables prefixed with `is` or `has`: `isMultiplayer`, `isLogin`, `isReady`, `isFinished`, `isOnline`, `hasError`
- Use descriptive names for ref variables: `channelRef`, `heartbeatRef`, `timerRef`

**Types:**
- PascalCase for interfaces: `AuthState`, `GameState`, `ButtonProps`, `QuestionCardProps`
- PascalCase for exported types: `Profile`, `Question`, `GameSession`, `GamePlayer`, `Challenge`, `Tournament`
- Suffix props interfaces with `Props`: `ButtonProps`, `InputProps`, `CardProps`, `BadgeProps`, `ModalProps`

**Constants:**
- UPPERCASE for environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- camelCase for game constants: `questionCount`, `timePerQuestion`, `maxPlayers`

## Code Style

**Formatting:**
- TypeScript with React JSX enabled
- No automatic formatter detected (no .prettierrc or prettier config)
- Indentation appears to be 2 spaces (standard from dependencies)
- Line length not strictly enforced

**Linting:**
- ESLint 9.39.4 with configuration in `eslint.config.js`
- Uses flat config format (ESLint 9+)
- Extends:
  - `@eslint/js` recommended rules
  - `typescript-eslint` recommended rules
  - `eslint-plugin-react-hooks` flat config
  - `eslint-plugin-react-refresh` vite config
- Browser globals enabled
- ECMAScript 2020 target

**TypeScript:**
- Target: ES2023
- Strict mode enabled
- Module resolution: bundler
- noUnusedLocals and noUnusedParameters: false (unused code allowed)
- JSX mode: react-jsx (automatic)

## Import Organization

**Order:**
1. React and external libraries: `import React`, `import { useEffect, useState }`, `import { useParams, useNavigate }`
2. External UI/Icon libraries: `import { CheckCircle, XCircle } from 'lucide-react'`
3. Local utilities and clients: `import { supabase } from '@/lib/supabase'`, `import questionsData from '@/data/questions.json'`
4. Store imports: `import { useAuthStore } from '@/stores/authStore'`
5. Type imports: `import type { Question, Profile } from '@/types'`
6. Component imports: `import { Button } from '@/components/ui/Button'`
7. CSS imports: `import './index.css'`

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in tsconfig.json)
- Always use `@/` prefix for local imports, never relative paths
- Examples:
  - `import { useAuthStore } from '@/stores/authStore'`
  - `import { Button } from '@/components/ui/Button'`
  - `import type { Profile } from '@/types'`

## Error Handling

**Patterns:**
- Use try/catch blocks for async operations in store methods and event handlers
- Store errors in component state: `const [error, setError] = useState('')`
- Display error messages to users in dedicated error containers
- Catch errors as `err: any` to access `.message` property
- Throw custom Error objects with user-friendly messages in German
- Pattern from `authStore.ts` login:
  ```typescript
  try {
    const email = usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await get().fetchProfile();
  } finally {
    set({ loading: false });
  }
  ```
- Supabase responses checked with `if (error)` pattern before throwing
- Use `finally` blocks to ensure loading state is cleared regardless of success/failure
- User-visible error messages in German: `'Beutzername bereits vergeben'`, `'Fehler aufgetreten'`
- Use message detection for Supabase errors: `msg.includes('Invalid login credentials')` to provide localized feedback

## Logging

**Framework:** console (no logging library detected)

**Patterns:**
- No structured logging in place
- Comments used for annotating complex logic sections
- Debugging would use browser console
- No error telemetry or crash reporting detected

## Comments

**When to Comment:**
- Comments used sparingly, only for clarifying non-obvious logic
- Single-line comments (`//`) for brief explanations
- No JSDoc documentation found in codebase

**Examples:**
- `// Helper: create a fake email from username (Supabase requires email)` in `supabase.ts`
- `// Real-time notifications` to section code blocks in `App.tsx`
- `// Update player score` for complex data mutations
- `// answers: Record<number, number>; // question_index -> answer_index` inline type hints

**JSDoc/TSDoc:**
- Not used in codebase
- TypeScript interfaces serve as documentation for props and types
- No function documentation blocks

## Function Design

**Size:**
- Compact functions generally 10-50 lines
- Zustand store methods are larger (30-60 lines) due to async logic and state management
- Event handlers keep UI logic minimal (5-25 lines)

**Parameters:**
- Props interfaces used for component parameters: `QuestionCardProps`, `ButtonProps`
- Destructuring in function signatures is standard: `({ question, onAnswer, timeLeft })` in `QuestionCard`
- Use typed parameters in stores: `(category: string, questionCount: number)`
- Supabase operations typically have minimal parameters with chained queries

**Return Values:**
- Async functions return `Promise<void>` or `Promise<Type>`
- Store methods return `Promise<void>` or resolve with ID strings: `Promise<string>`
- Components always return JSX
- Utility functions typed explicitly: `(username: string): string`

## Module Design

**Exports:**
- Named exports for components: `export function Button({...})`
- Named exports for stores: `export const useAuthStore = create<AuthState>(...)`
- Named exports for utility functions: `export const usernameToEmail = (...)`
- Default export for app entry: `export default function App()`
- Type exports use `export interface` and `export type`

**Barrel Files:**
- `src/types/index.ts` exports all types and interfaces
- No barrel files for components (direct imports used)
- No star exports (`export *`) observed

**Example module structure from `Button.tsx`:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  // implementation
}
```

## Component Patterns

**Props:**
- Extend native HTML elements: `interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`
- Default values in destructuring: `{ variant = 'primary', size = 'md', loading = false }`
- Use rest operator for passthrough props: `{ className, children, ...props }`

**Styling:**
- Tailwind CSS with `clsx` utility for conditional classes
- Color scheme: dark mode (slate-950, slate-900 backgrounds, indigo accent)
- Responsive design with Tailwind breakpoints: `sm:`, `lg:`, `grid-cols-1 lg:grid-cols-3`
- Example from `Button.tsx`:
  ```typescript
  className={clsx(
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    { 'bg-indigo-600 hover:bg-indigo-500': variant === 'primary' },
    { 'px-3 py-1.5 text-sm': size === 'sm' },
    fullWidth && 'w-full',
    className
  )}
  ```

**State Management:**
- React hooks (useState) for local component state
- Zustand stores for global state: `useAuthStore`, `useGameStore`, `useNotificationStore`
- Effect cleanup with return functions in useEffect

**Real-time Features:**
- Supabase channels for live updates: `.channel('game:' + sessionId)`
- Postgres change listeners for database mutations
- Subscribe/unsubscribe pattern with ref storage: `channelRef.current`

## Async Operations

**Pattern:**
- Async methods in stores handle database operations
- Set loading state before operation: `set({ loading: true })`
- Clear loading state in finally block: `finally { set({ loading: false }) }`
- Handle Supabase errors with optional destructuring: `const { data, error } = await query`
- Check for errors: `if (error) throw error;` or `if (!data) return;`

---

*Convention analysis: 2026-03-30*
