# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Status:** No testing framework configured

**Framework:** Not detected
- No test dependencies in `package.json`
- No jest.config.js, vitest.config.js, or similar config files
- No test files found (*.test.ts, *.spec.ts patterns)

**Current State:**
- 0% test coverage
- No test infrastructure in place
- No CI/CD test pipeline configured

## Test File Organization

**Current:** Not applicable (no tests exist)

**Recommended Structure (when implementing):**
- Co-located tests: `src/components/ui/Button.test.tsx` alongside `src/components/ui/Button.tsx`
- Store tests: `src/stores/authStore.test.ts`
- Component tests for: UI components, pages with business logic, hooks

**Naming Convention (recommended):**
- Files: `[ComponentName].test.tsx` or `[ModuleName].test.ts`
- Suites: Describe the component/module being tested
- Tests: Use "should" prefix for behavior descriptions

## Test Structure

**Recommended testing library:** Vitest (aligned with Vite usage) or Jest with React Testing Library

**Suite Organization (recommended pattern):**
```typescript
describe('Button Component', () => {
  describe('rendering', () => {
    it('should render with default variant', () => {
      // test
    });

    it('should apply custom className', () => {
      // test
    });
  });

  describe('interactions', () => {
    it('should call onClick handler when clicked', () => {
      // test
    });

    it('should be disabled when loading is true', () => {
      // test
    });
  });
});
```

**Patterns (recommended):**
- Setup: Render component with required props
- Act: Trigger interactions (clicks, form submissions)
- Assert: Verify output/behavior with assertions
- Teardown: Handled automatically by testing library

## Mocking

**Current State:** No mocking framework in place

**Recommended Framework:** Vitest's mock functionality or Jest mocks

**What to Mock:**
- Supabase client: Mock database queries and auth methods
- React Router: Mock useNavigate, useParams hooks
- Zustand stores: Mock store state and actions
- External API calls
- Timers and intervals (for tests with delays)

**What NOT to Mock:**
- Component rendering (test actual output)
- Zustand hooks directly (test store behavior with actual hooks)
- UI library exports (test real component behavior)
- Tailwind classes (style testing not needed)

**Example Pattern (recommended):**
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));
```

## Fixtures and Factories

**Current:** Not applicable (no test framework)

**Recommended Approach:**
- Create `src/__tests__/fixtures/` directory for test data
- Factory functions for creating test objects: `createMockProfile()`, `createMockGameSession()`
- Mock data files for consistent test state

**Example Factory (recommended):**
```typescript
// src/__tests__/fixtures/profiles.ts
export function createMockProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: 'test-id-123',
    username: 'testuser',
    total_score: 0,
    games_played: 0,
    is_online: true,
    ...overrides,
  };
}
```

## Coverage

**Requirements:** Not enforced

**Current Coverage:** 0% (no tests)

**Recommendations (if implemented):**
- Target 70%+ coverage for business logic
- Focus on stores and complex components first
- Not all utility functions need tests

## Test Types

**Unit Tests (recommended):**
- Components: Test props, conditional rendering, event handlers
- Store functions: Test state mutations, async operations
- Utilities: Test helper functions

**Integration Tests (recommended):**
- Store + Component interaction: Test component using store
- Form submission flows
- Navigation after async operations

**E2E Tests:**
- Not currently used
- Consider for critical user flows: login → game → results

## Common Patterns

**Async Testing (recommended):**
```typescript
it('should fetch profile on login', async () => {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: { id: 'user-123' } },
    error: null,
  });

  const { result } = renderHook(() => useAuthStore());

  await act(async () => {
    await result.current.login('testuser', 'password123');
  });

  expect(result.current.user).toBeDefined();
});
```

**Error Testing (recommended):**
```typescript
it('should handle login error gracefully', async () => {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: null,
    error: new Error('Invalid credentials'),
  });

  const { result } = renderHook(() => useAuthStore());

  await expect(
    act(async () => await result.current.login('user', 'wrong'))
  ).rejects.toThrow('Invalid credentials');
});
```

## Areas Needing Tests

**Critical Components (high priority):**
- `src/stores/authStore.ts` - Login, registration, profile logic
- `src/stores/gameStore.ts` - Game session management, answer submission, scoring
- `src/pages/GamePage.tsx` - Main game flow, multiplayer coordination
- `src/components/game/QuestionCard.tsx` - Timer logic, answer selection, feedback

**Pages (medium priority):**
- `src/pages/LoginPage.tsx` - Form validation, error display, navigation
- `src/pages/ChallengePage.tsx` - Challenge creation, opponent selection
- `src/pages/TournamentPage.tsx` - Tournament flow

**UI Components (low-medium priority):**
- `src/components/ui/Button.tsx` - Variants, loading state, disabled state
- `src/components/ui/Input.tsx` - Error display, icon rendering, props passing
- `src/components/ui/Card.tsx` - Props handling, className merging

**Untested Flows (high risk):**
- Real-time game updates via Supabase channels
- Tournament bracket progression
- Challenge acceptance/declining
- Achievement unlocking
- User online status heartbeat

## Setup Recommendations

**Package.json additions (if implementing):**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@vitest/ui": "^1.0.0",
    "jsdom": "^23.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Vite config (if using Vitest):**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
});
```

---

*Testing analysis: 2026-03-30*
