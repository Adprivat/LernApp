# Phase 3: Auth Security Fix - Research

**Researched:** 2026-03-30
**Domain:** Client-side authentication security — username enumeration prevention with supabase-js v2
**Confidence:** HIGH (core approach), MEDIUM (migration strategy), HIGH (threat model analysis)

---

## Summary

The current `usernameToEmail()` helper generates deterministic, trivially guessable email addresses (`alice@lernapp.local`). An attacker who knows any username can attempt authentication directly against Supabase's auth endpoint, learning with certainty whether that username is registered. This is a username enumeration vulnerability.

The constraint that there is no backend (Supabase-only, client-side fix) means a true secret cannot be kept from an attacker with DevTools. Any `VITE_*` environment variable is compiled into the JavaScript bundle verbatim at build time and is readable in plain text from the production assets. This changes the threat model: the fix cannot rely on cryptographic secrecy of the key, but it CAN raise the bar from "trivially guessable by anyone" to "requires source inspection or key extraction per-deployment." That is a meaningful improvement over the current state.

The recommended approach is HMAC-SHA256 of the lowercase username, keyed with a `VITE_EMAIL_SALT` environment variable, producing a 64-character hex string used as the email local part. This is deterministic (same username always maps to the same email, enabling login), opaque (no direct string match to the username), and deployment-specific (the salt is set per-environment, so the mapping differs between dev and production). Existing users require a lazy migration on first login that calls `supabase.auth.updateUser({ email: newHashedEmail })` immediately after successful authentication with the old email.

**Primary recommendation:** Replace `usernameToEmail()` with `usernameToHashedEmail()` using Web Crypto API HMAC-SHA256 + `VITE_EMAIL_SALT`, with a lazy migration path for existing users that detects the old email format and migrates on successful login.

---

## Project Constraints (from CLAUDE.md)

- No email-based login — username + password UX must be preserved
- `src/lib/supabase.ts` is the only place database/auth operations should originate
- Stores manage local state; Supabase is the single source of truth
- Auth state in `useAuthStore` (Zustand)
- No `cn()` wrapper — use `clsx` directly
- Tailwind v4, no `tailwind.config.js`
- `npm run build` must pass TypeScript check with no errors
- Channel cleanup must use `supabase.removeChannel()` (not `.unsubscribe()`)
- Environment variables follow `VITE_` prefix pattern (already established by `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

---

## Threat Model Analysis

### What "enumerable" actually means in context

Current attack: `GET /auth/v1/token?grant_type=password` with body `{email:"alice@lernapp.local", password:"wrong"}` returns a 400 with `"Invalid login credentials"`. A 200 would mean the user exists. An attacker can script this for any username list with zero prior knowledge.

### Why a client-side HMAC key is not truly secret

All `VITE_*` variables are inlined at build time. `strings dist/assets/index-[hash].js | grep lernapp` will find the salt. This is confirmed by Vite's own documentation and by documented real-world incidents of CI/CD credential leakage from VITE-prefixed variables.

### What the fix actually achieves (honest scope)

| Attack vector | Before fix | After fix |
|---|---|---|
| Guess `alice@lernapp.local` without source access | Trivially possible | Not possible |
| Enumerate via auth endpoint with known username list | Free, no effort | Still possible after key extraction |
| Extract HMAC key from JS bundle | N/A | Possible with DevTools or curl + grep |
| Reverse HMAC output back to username | N/A | Not feasible (one-way function) |
| Enumerate users without username guesses | Not possible | Not possible |

The fix eliminates the zero-effort attack and raises the cost to "must inspect production bundle first." For a learning platform without backend infrastructure, this is the realistic maximum achievable client-side. The CONCERNS.md entry for this issue also recommends rate-limiting and CAPTCHA as complementary server-side controls; those are out of scope for this phase.

**Confidence: HIGH** — This threat model analysis is based on fundamental properties of how Vite bundles environment variables and how HMAC works.

---

## Standard Stack

### Core (no new dependencies required)

| API | Version | Purpose | Why Use It |
|---|---|---|---|
| `window.crypto.subtle` (Web Crypto API) | Built-in (Baseline since Jan 2020) | HMAC-SHA256 signing | No bundle size cost, works in all modern browsers, secure context only |
| `TextEncoder` | Built-in | Encode strings to Uint8Array for crypto | Standard, no polyfill needed for modern browsers |

### No New NPM Packages Needed

The Web Crypto API (`crypto.subtle`) is available natively in all modern browsers and Node.js 20+ (confirmed by project's Node v20.18.0). No third-party crypto library is necessary.

**Why not CryptoJS or similar npm packages:** They add bundle weight and are unnecessary when Web Crypto API covers the use case. Web Crypto is also the only browser API that runs in a secure context, which provides an additional layer of protection.

**Why not UUID v5 (from `uuid` npm package):** UUID v5 uses SHA-1 internally (weaker than SHA-256) and the `uuid` package is not currently in the project's dependencies. More importantly, UUID v5 has documented security warnings against use in authentication contexts because it is deterministic from known inputs.

**Installation:** None required.

**Version verification:** N/A (built-in browser API).

---

## Architecture Patterns

### Recommended Project Structure (no new files needed)

The entire change is contained in two files:

```
src/
└── lib/
    └── supabase.ts          # Replace usernameToEmail() with usernameToHashedEmail()
└── stores/
    └── authStore.ts         # Update login() to handle lazy migration; update register()
```

A new migration SQL file is needed if the `profiles` table needs a `email_migrated` column, but the lazy migration can be implemented without schema changes (see Pattern 2 below).

### Pattern 1: HMAC-SHA256 Email Derivation

**What:** Async function that derives a non-guessable email from a username using HMAC-SHA256.

**When to use:** Called wherever `usernameToEmail()` is currently called (registration and login).

**Key constraint on email format:** RFC 5321 limits the local part (before `@`) to 64 characters. An HMAC-SHA256 output is 32 bytes = 64 hex characters. This fits exactly within the limit. The domain part `@lernapp.local` is unchanged. Total email: `[64-char hex]@lernapp.local` = 78 characters, well within RFC 5321's 256-character total limit.

**Source:** [MDN SubtleCrypto.sign()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign)

```typescript
// src/lib/supabase.ts

const EMAIL_SALT = import.meta.env.VITE_EMAIL_SALT || 'dev-fallback-salt-change-in-prod';

/**
 * Derives a non-guessable email from a username using HMAC-SHA256.
 * The result is deterministic for a given (username, VITE_EMAIL_SALT) pair,
 * which allows repeated logins to resolve to the same Supabase auth email.
 *
 * Security note: VITE_EMAIL_SALT is embedded in the JS bundle at build time.
 * This raises the enumeration cost from "trivial guess" to "requires bundle inspection."
 * It does NOT provide cryptographic secrecy of the mapping.
 */
export async function usernameToHashedEmail(username: string): Promise<string> {
  const keyMaterial = new TextEncoder().encode(EMAIL_SALT);
  const message = new TextEncoder().encode(username.toLowerCase());

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,         // not extractable
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);

  const hexHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hexHash}@lernapp.local`;
}

/**
 * Detects the old plaintext email format.
 * Used during lazy migration to identify users still on the old scheme.
 */
export function isLegacyEmail(email: string): boolean {
  return email.endsWith('@lernapp.local') && !email.match(/^[0-9a-f]{64}@/);
}

/**
 * Legacy synchronous helper — kept only for detecting old format during migration.
 * Do NOT use for new registrations or logins.
 * @deprecated Use usernameToHashedEmail() instead.
 */
export const usernameToEmail = (username: string): string =>
  `${username.toLowerCase()}@lernapp.local`;
```

### Pattern 2: Lazy Migration on Login (No Schema Change Required)

**What:** On login, try the hashed email first. If that fails, try the legacy email. If the legacy login succeeds, immediately call `supabase.auth.updateUser()` to migrate the email to the new format.

**Why lazy migration is viable here:**
- The `profiles.username` column is the source of truth for the human-readable identity.
- The `auth.users.email` column is an internal implementation detail — it was never shown to users.
- Supabase's `supabase.auth.updateUser({ email: newEmail })` can update the authenticated user's email from within the same session.
- With email confirmations disabled (as required by CLAUDE.md setup instructions), the update takes effect immediately without an email confirmation round-trip.

**Important constraint:** Email confirmation must be disabled in Supabase Dashboard (Authentication → Settings → "Enable email confirmations" = OFF). This is already required by the project setup instructions in CLAUDE.md.

**Source:** [Supabase updateUser docs](https://supabase.com/docs/reference/javascript/auth-updateuser), [GitHub discussion on email update without confirmation](https://github.com/orgs/supabase/discussions/29923)

```typescript
// src/stores/authStore.ts — login() method

login: async (username: string, password: string) => {
  set({ loading: true });
  try {
    const hashedEmail = await usernameToHashedEmail(username);

    // Try new hashed email first (fast path for already-migrated users)
    let { error } = await supabase.auth.signInWithPassword({
      email: hashedEmail,
      password,
    });

    if (error) {
      // Fallback: try legacy email for users not yet migrated
      const legacyEmail = usernameToEmail(username); // keep legacy helper for this
      const { error: legacyError } = await supabase.auth.signInWithPassword({
        email: legacyEmail,
        password,
      });

      if (legacyError) throw legacyError; // Both failed — wrong credentials

      // Legacy login succeeded — migrate email in background (non-blocking)
      // Do NOT await this; allow the session to proceed immediately.
      // If migration fails, the user remains on legacy format and will
      // be prompted to migrate on the next login attempt.
      supabase.auth.updateUser({ email: hashedEmail }).catch(() => {
        // Silent fail — user will retry migration on next login
      });
    }

    await get().fetchProfile();
  } finally {
    set({ loading: false });
  }
},
```

**Alternative: blocking migration approach**

```typescript
// Blocking variant — waits for migration before proceeding
// Use this if you need to guarantee migration completes in one step.
// Downside: slower login for un-migrated users.
const { error: updateError } = await supabase.auth.updateUser({ email: hashedEmail });
// updateError can be safely ignored if desired (user is already authenticated)
```

### Pattern 3: Register with Hashed Email

```typescript
// src/stores/authStore.ts — register() method
register: async (username: string, password: string) => {
  set({ loading: true });
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) throw new Error('Benutzername bereits vergeben');

    const email = await usernameToHashedEmail(username); // NEW: async
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Registrierung fehlgeschlagen');

    // Profile creation unchanged...
  } finally {
    set({ loading: false });
  }
},
```

### Anti-Patterns to Avoid

- **Using `Math.random()` or `Date.now()` for email generation:** Not deterministic — the user could not log in again after registration. Must be a deterministic function of the username.
- **Storing the generated email in localStorage as a lookup table:** Defeats the purpose; the mapping becomes trivially recoverable from the browser.
- **Using `UUID v4` (random) and storing the mapping in the `profiles` table:** Requires an extra database read on every login to look up the stored UUID. Higher latency, more complex, and requires a schema change.
- **Using `UUID v5` without a secret namespace:** UUID v5 is purely deterministic from known inputs with no secret component — provides no security improvement over the current plaintext approach.
- **Exposing the HMAC salt in a way that differs from the existing `VITE_SUPABASE_*` env var pattern:** The project already accepts that `VITE_*` vars are client-visible (e.g. `VITE_SUPABASE_ANON_KEY`). `VITE_EMAIL_SALT` follows the same established convention.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| HMAC-SHA256 computation | Custom bit manipulation or manual SHA-256 | `crypto.subtle.sign('HMAC', ...)` | Web Crypto API is the browser standard, audited, constant-time |
| Hex encoding of ArrayBuffer | Custom byte-to-string loop | `Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')` | This exact pattern IS the standard approach — it is short enough that it is not hand-rolling |
| Detecting legacy email format | Complex regex parser | `isLegacyEmail()` helper using simple string match | The pattern is unambiguous: old emails are `username@lernapp.local` where username is 3-20 chars `[a-zA-Z0-9_-]`; new emails have 64 hex chars before `@` |

**Key insight:** The Web Crypto API eliminates the need for any external crypto dependency. The entire implementation is ~20 lines of TypeScript using browser built-ins.

---

## Common Pitfalls

### Pitfall 1: `crypto.subtle` is async — callers must await

**What goes wrong:** Attempting to use `usernameToHashedEmail()` synchronously, e.g., `const email = usernameToHashedEmail(username)` (without `await`) results in `email` being a `Promise<string>`, not a string. This silently passes a Promise object to Supabase auth, causing a confusing error.

**Why it happens:** `crypto.subtle.importKey()` and `crypto.subtle.sign()` are both Promise-based. There is no synchronous HMAC API in the browser.

**How to avoid:** The function signature must return `Promise<string>`. All call sites (`login()`, `register()`) must use `await`. TypeScript will catch this if the return type annotation is included.

**Warning signs:** TypeScript error `Type 'Promise<string>' is not assignable to type 'string'` at any call site.

### Pitfall 2: Forgetting email confirmation must be OFF

**What goes wrong:** If Supabase's "Enable email confirmations" is ON, calling `supabase.auth.updateUser({ email: newHashedEmail })` during lazy migration will send a confirmation email to a non-existent address (`64hexchars@lernapp.local`) and the migration will appear to hang. The user's auth email will remain on the old format.

**Why it happens:** The CLAUDE.md setup instructions say "Enable email confirmations deaktivieren," but this is easy to miss or may be reset when creating a new project.

**How to avoid:** Document this requirement explicitly in the plan. The planner should add a "Precondition check" task that verifies email confirmation is disabled before running migration code.

**Warning signs:** After `updateUser()`, the user can still log in with the legacy email on the next attempt (migration did not apply).

### Pitfall 3: Case sensitivity in HMAC input

**What goes wrong:** If a user registers as `Alice` but tries to log in as `alice`, the HMAC will produce a different hash for each, and login will fail.

**Why it happens:** HMAC is case-sensitive.

**How to avoid:** Always `.toLowerCase()` the username before passing it to `usernameToHashedEmail()`. This is consistent with the existing `usernameToEmail()` behavior.

**Warning signs:** Login fails for users whose username contains uppercase letters.

### Pitfall 4: `VITE_EMAIL_SALT` fallback value reaching production

**What goes wrong:** If `VITE_EMAIL_SALT` is not set in the production environment, the fallback string `'dev-fallback-salt-change-in-prod'` is used. This is a known-constant key, essentially equivalent to the current plaintext scheme for anyone who reads the source code.

**Why it happens:** Vite/Rollup silently uses the fallback if the env var is absent at build time.

**How to avoid:** The plan should include a build-time assertion that `VITE_EMAIL_SALT` is set to a non-default value. A simple check in `src/lib/supabase.ts`:

```typescript
if (import.meta.env.PROD && import.meta.env.VITE_EMAIL_SALT === 'dev-fallback-salt-change-in-prod') {
  console.error('[Security] VITE_EMAIL_SALT is using the default dev value in production!');
}
```

**Warning signs:** Production builds that silently use the dev salt are indistinguishable from correct builds at runtime without this check.

### Pitfall 5: Race condition between updateUser() and fetchProfile()

**What goes wrong:** If the non-blocking migration `supabase.auth.updateUser({ email: hashedEmail }).catch(...)` is called at the same time as `fetchProfile()`, the async operations may interleave and cause unexpected behavior in Supabase's session state.

**Why it happens:** Both operations touch the auth session.

**How to avoid:** Either await the migration before calling `fetchProfile()` (blocking approach), or fire the migration strictly after `fetchProfile()` completes. The non-blocking approach in Pattern 2 fires migration before `fetchProfile()`, which is safe because `fetchProfile()` reads `profiles`, not `auth.users.email`.

---

## Code Examples

### Full `usernameToHashedEmail` implementation (verified against MDN Web Crypto API)

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign
// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey

const EMAIL_SALT = import.meta.env.VITE_EMAIL_SALT || 'dev-fallback-salt-change-in-prod';

export async function usernameToHashedEmail(username: string): Promise<string> {
  const keyMaterial = new TextEncoder().encode(EMAIL_SALT);
  const message = new TextEncoder().encode(username.toLowerCase());

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, message);

  const hexHash = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Result: 64-char hex string + @lernapp.local = 78 chars total
  // RFC 5321 limits: local part ≤ 64 chars ✓, total ≤ 254 chars ✓
  return `${hexHash}@lernapp.local`;
}
```

### Legacy email detection helper

```typescript
/**
 * Returns true if the email is in the old plaintext format (username@lernapp.local
 * where the local part is NOT a 64-char hex string).
 */
export function isLegacyEmail(email: string): boolean {
  // New format: exactly 64 lowercase hex chars before @lernapp.local
  const hashedPattern = /^[0-9a-f]{64}@lernapp\.local$/;
  return email.endsWith('@lernapp.local') && !hashedPattern.test(email);
}
```

### Development `.env` template additions

```bash
# .env.example additions
VITE_EMAIL_SALT=change-this-to-a-random-string-in-production
```

### Generating a production-quality salt value

```bash
# Run once to generate a salt; paste result into production env var
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Approach Tradeoffs

| Approach | Deterministic | Bundle-safe | Migration | Complexity | Verdict |
|---|---|---|---|---|---|
| HMAC-SHA256 + `VITE_EMAIL_SALT` | Yes | No (key in bundle) | Lazy login | Low | **RECOMMENDED** |
| UUID v5 + namespace secret | Yes | No (namespace in bundle) | Lazy login | Low | Weaker than HMAC (SHA-1 internally) |
| UUID v4 + stored in `profiles` | No | Yes | None needed | Medium | Extra DB read on every login |
| Random email at registration + stored in `profiles.auth_email` | No | Yes | Schema change required | Medium-High | No migration path; schema change; extra read |
| Server-side email generation (backend) | Yes | Yes | Requires backend | Out of scope | Correct solution but violates constraint |

**Why UUID v4 + profiles lookup is worse despite being "more secure":**
- Requires an extra `SELECT` from `profiles` before every login to look up the stored email, adding latency and a failure mode.
- Requires a schema change (new column in `profiles`).
- Provides no enumeration protection for the lookup endpoint itself — an attacker can query `profiles` for any username.

**Why HMAC-SHA256 is the best available option given the constraints:**
- Zero additional database reads — the email is computed locally in < 1ms.
- No schema changes.
- Lazy migration works with a single `updateUser()` call.
- The key being in the bundle is an accepted tradeoff, consistent with how `VITE_SUPABASE_ANON_KEY` is already handled.

---

## Migration Strategy — Step by Step

**Precondition:** Supabase project has "Enable email confirmations" = OFF (already required by CLAUDE.md setup).

**Phase execution order:**

1. Add `VITE_EMAIL_SALT` to `.env` and `.env.example`
2. Add `usernameToHashedEmail()` and `isLegacyEmail()` to `src/lib/supabase.ts` (keep deprecated `usernameToEmail()` for migration fallback)
3. Update `authStore.register()` to use `await usernameToHashedEmail()`
4. Update `authStore.login()` to implement the two-phase login (hashed first, legacy fallback + migration)
5. All new user registrations immediately use the hashed email format
6. Existing users are migrated transparently on first login after deployment
7. After a defined period (or when `profiles` data confirms all users migrated), `usernameToEmail()` and the legacy fallback can be removed

**No data migration script required.** The lazy migration handles each user on their next login. If a user never logs in again, their stale legacy email in `auth.users` is harmless — the account is effectively dormant.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes within the existing Supabase + React stack. No new external tools, services, CLIs, runtimes, or databases are required beyond what is already established.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Storing real email for username-based auth | Fake email with deterministic pattern | Supabase v2 (always required email) | Created enumeration surface |
| CryptoJS for browser crypto | Web Crypto API (built-in) | ~2017 (broad availability by 2020) | No external crypto library needed |

**Deprecated/outdated:**

- `usernameToEmail()` synchronous helper: replace with async `usernameToHashedEmail()`. Keep temporarily as deprecated for the migration fallback path only.
- UUID v3 (MD5-based): not relevant, but worth noting it's considered weaker than UUID v5 which itself is considered too weak for auth purposes.

---

## Open Questions

1. **Should the migration be blocking or non-blocking?**
   - What we know: Non-blocking is faster for the user; blocking guarantees migration completes.
   - What's unclear: Whether Supabase's session state handles concurrent `updateUser()` + `fetchProfile()` calls safely.
   - Recommendation: Use non-blocking (fire-and-forget) migration. The risk of concurrent session state issues is low because `fetchProfile()` reads `profiles`, not `auth.users`. Document this decision in the plan.

2. **What happens if `updateUser()` fails during migration?**
   - What we know: The user is already authenticated (the legacy login succeeded), so the session is valid. The failure is in the migration step.
   - What's unclear: Whether Supabase returns a specific error for "email already taken" vs. other failures.
   - Recommendation: Silently catch and ignore migration errors. The user will re-attempt migration on their next login. This is acceptable for a lazy migration.

3. **Is there a Supabase GoTrue hard limit on email local part length?**
   - What we know: RFC 5321 limits the local part to 64 characters; a 32-byte HMAC-SHA256 output produces exactly 64 hex chars. Standard email validation libraries enforce this.
   - What's unclear: Whether GoTrue applies RFC 5321 or has its own, looser validation.
   - Recommendation: 64 hex chars is within RFC 5321 limits. If GoTrue is stricter (unlikely), truncate to 32 chars (16 bytes of HMAC output as hex), which provides adequate entropy.

---

## Sources

### Primary (HIGH confidence)
- [MDN SubtleCrypto.sign()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign) — HMAC signing API, browser compatibility
- [MDN SubtleCrypto.importKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey) — key import for HMAC
- [Vite Env Variables and Modes](https://vite.dev/guide/env-and-mode) — VITE_* prefix behavior, bundle inlining at build time

### Secondary (MEDIUM confidence)
- [Supabase auth-updateuser docs](https://supabase.com/docs/reference/javascript/auth-updateuser) — updateUser() for email migration
- [Supabase Discussion #29923 — update email without confirmation](https://github.com/orgs/supabase/discussions/29923) — confirmed updateUser behavior with email confirmations disabled
- [UUID v5 security warning](https://inventivehq.com/blog/when-to-use-uuid-v5-deterministic-id-generation) — confirmed UUID v5 is unsuitable for auth security tokens
- [RFC 5321 email length limits](https://www.directedignorance.com/blog/maximum-length-of-email-address) — local part max 64 octets; 64 hex chars fits exactly

### Tertiary (LOW confidence)
- [Sprocket Security — Vite secret exposure](https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise) — real-world evidence of VITE_* vars in production bundles
- [SecureCodeWarrior — username enumeration](https://www.securecodewarrior.com/article/secure-coding-technique-avoiding-username-enumeration-through-side-channel-attacks) — general enumeration prevention principles

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Web Crypto API is browser-native, well-documented, widely supported
- Architecture: HIGH — HMAC-SHA256 + lazy migration is the only viable pattern given the client-side-only constraint
- Pitfalls: HIGH — async HMAC, email confirmation, case sensitivity, and salt fallback are verifiable concrete issues
- Threat model: HIGH — Vite env var exposure is a documented, confirmed behavior, not speculation

**Research date:** 2026-03-30
**Valid until:** 2026-09-30 (Supabase auth APIs are stable; Web Crypto API is a long-standing standard)
