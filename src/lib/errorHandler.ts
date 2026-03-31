/**
 * Centralized error handling utilities for LernApp.
 *
 * Replaces ad-hoc `catch (err: any)` patterns across the codebase.
 * All user-facing messages are in German, consistent with the app's UI language.
 */

/**
 * Extracts a human-readable message from any thrown value.
 *
 * Handles:
 * - Error instances (err.message)
 * - Plain strings
 * - Objects with a .message string property (covers Supabase PostgrestError)
 * - Anything else (returns generic German fallback)
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (
    err !== null &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as Record<string, unknown>).message === 'string'
  ) {
    return (err as Record<string, unknown>).message as string;
  }
  return 'Ein unerwarteter Fehler ist aufgetreten';
}

/**
 * Type guard for Supabase PostgrestError shape.
 *
 * A PostgrestError always has at minimum a string `message` and string `code`.
 * The `details` and `hint` fields are present but may be null in practice,
 * so the guard only requires `message` and `code` to be strings.
 */
export function isSupabaseError(
  err: unknown
): err is { message: string; code: string; details: string; hint: string } {
  if (err === null || typeof err !== 'object') {
    return false;
  }
  const candidate = err as Record<string, unknown>;
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.code === 'string'
  );
}

/**
 * Maps a Supabase error to a user-friendly German message.
 *
 * Checks known hint values and message substrings first.
 * Falls back to the provided `fallback` string, or the raw error message
 * if no fallback is given.
 *
 * Returns an empty string when `error` is null/undefined (no error condition).
 */
export function handleSupabaseError(
  error: { message: string; code?: string; hint?: string } | null | undefined,
  fallback?: string
): string {
  if (!error) {
    return '';
  }

  // Hint-based discrimination (stable, set explicitly by RPCs)
  if (error.hint === 'already_accepted') {
    return 'Diese Aktion ist nicht mehr verfuegbar.';
  }
  if (error.hint === 'unauthorized') {
    return 'Nicht autorisiert.';
  }

  // Message-substring patterns from PostgREST / Supabase Auth
  if (error.message.includes('duplicate key')) {
    return 'Dieser Eintrag existiert bereits.';
  }
  if (error.message.includes('not found') || error.message.includes('no rows')) {
    return 'Eintrag nicht gefunden.';
  }
  if (error.message.includes('Invalid login credentials')) {
    return 'Falscher Benutzername oder Passwort';
  }
  if (error.message.includes('already registered')) {
    return 'Benutzername bereits vergeben';
  }

  return fallback !== undefined ? fallback : error.message;
}
