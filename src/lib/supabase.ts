import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

const EMAIL_SALT = import.meta.env.VITE_EMAIL_SALT || 'dev-fallback-salt-change-in-prod';

if (import.meta.env.PROD && EMAIL_SALT === 'dev-fallback-salt-change-in-prod') {
  console.error('[Security] VITE_EMAIL_SALT is using the default dev value in production! Set a unique random string.');
}

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
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);

  const hexHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Result: 64-char hex string + @example.com = 76 chars total
  // @example.com is IANA-reserved (RFC 2606) with real DNS — passes all email validators.
  // No real emails are ever sent; Supabase auth is password-only.
  return `${hexHash}@example.com`;
}

/**
 * Returns true if the email is in the old plaintext format (username@example.com
 * where the local part is NOT a 64-char hex string).
 * Used during lazy migration to identify users still on the old scheme.
 */
export function isLegacyEmail(email: string): boolean {
  const hashedPattern = /^[0-9a-f]{64}@example\.com$/;
  return email.endsWith('@example.com') && !hashedPattern.test(email);
}

/** @deprecated Use usernameToHashedEmail() instead. Kept for lazy migration fallback only. */
export const usernameToEmail = (username: string): string =>
  `${username.toLowerCase()}@example.com`;

export default supabase;
