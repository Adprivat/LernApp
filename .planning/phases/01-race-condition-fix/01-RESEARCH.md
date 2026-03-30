# Phase 1: Race Condition Fix - Research

**Researched:** 2026-03-30
**Domain:** PostgreSQL atomic operations, Supabase RPC, concurrent write safety
**Confidence:** HIGH

---

## Summary

The bug is a classic "check-then-act" race condition. Two clients both read that a challenge has `status = 'pending'`, then both proceed to create a game session and update the challenge. The result is two `game_sessions` rows for the same challenge and one of them "wins" the `session_id` update while the other creates an orphaned session.

The root cause is that `joinOpenChallenge()` in `ChallengePage.tsx` performs three separate round-trips to Supabase (insert session, update challenge, insert notification) with no atomicity guarantee. Between the read (`status = 'pending'`) and the write (`status = 'accepted'`), any concurrent caller can slip through.

The correct fix is a single PostgreSQL function called via `supabase.rpc()`. Inside the function, a conditional `UPDATE ... WHERE status = 'pending' RETURNING *` is the atomic check-and-claim. If the `UPDATE` affects 0 rows, the challenge was already claimed and the function raises an exception. The client catches this via `error.code === 'P0001'` and shows a user-friendly message. This same pattern applies to `respondToChallenge()` and `startTournament()`.

**Primary recommendation:** Replace the multi-step client-side logic in `joinOpenChallenge()`, `respondToChallenge()` (accept path), and `startTournament()` with individual PostgreSQL RPC functions that perform the check, session creation, and status update in a single transaction.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUG-01 | Race Condition bei Challenge-Annahme verhindert doppelte Game Sessions | Atomic UPDATE WHERE + RPC pattern fully addresses this for both open challenges and targeted challenges |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- Pages call Supabase only via stores or direct hooks — NOT directly. ChallengePage and TournamentPage currently call supabase directly; this pattern is already in use and the fix stays consistent with existing page-level calls (no store required for the RPC approach).
- All DB operations go through `src/lib/supabase.ts` (the singleton client).
- New DB functions must be added to `supabase/schema.sql` so they are reproducible.
- `npm run build` must pass (TypeScript strict, no `any` without justification).
- No new tables — the fix uses existing schema only.
- No email/migration changes in scope.
- React 19 + TypeScript + Supabase JS v2.100.1 (verified).
- Tailwind v4 / clsx / no cn() wrapper (UI conventions, not directly relevant here).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.100.1 (verified) | RPC calls, error handling | Already in project — `supabase.rpc()` is the correct PostgREST gateway |
| PostgreSQL (via Supabase) | 15.x (Supabase hosted) | Atomic transaction, plpgsql function | Only place that can guarantee atomicity |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| plpgsql | built-in | Write the RPC function body | Any time multi-step DB logic needs atomicity |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RPC function | Supabase Edge Function | Edge Function adds network hop and cold-start latency; plpgsql function runs inside the DB transaction boundary — simpler and faster for this case |
| RPC function | Optimistic locking with version counter | Requires a schema change (adding a `version` column) and client-side retry loop — more complexity than needed |
| RPC function | Advisory locks | More appropriate for queue-processing patterns; overkill here since a simple conditional UPDATE is sufficient |
| RPC function | SERIALIZABLE isolation via direct pg connection | Not possible through supabase-js / PostgREST; requires Edge Function with deno-postgres — unnecessary complexity |

**Installation:** No new packages needed. The fix is pure SQL + TypeScript using existing dependencies.

---

## Architecture Patterns

### Recommended Project Structure

No new files needed except appending to `supabase/schema.sql`. Client changes are in the existing page files.

```
supabase/
└── schema.sql          # Append new RPC functions here

src/pages/
├── ChallengePage.tsx   # Replace joinOpenChallenge() and respondToChallenge() accept path
└── TournamentPage.tsx  # Replace startTournament()
```

### Pattern 1: Atomic Conditional UPDATE (the core primitive)

**What:** A PostgreSQL function that atomically changes status from `pending` to `accepted` in a single SQL statement. If the row was already claimed, `UPDATE` affects 0 rows, and the function raises an exception.

**When to use:** Any time client code does "read status, then write if status is X" — that is inherently racy.

**Why it works:** In PostgreSQL, a single `UPDATE ... WHERE status = 'pending'` statement acquires a row-level write lock and evaluates the WHERE predicate atomically. No other concurrent transaction can change `status` between the check and the write. The entire function body runs as a single transaction (default plpgsql behavior).

**SQL Example:**

```sql
-- Source: PostgreSQL docs on implicit transactions in plpgsql functions
-- + PostgREST docs on RAISE EXCEPTION → HTTP 400

CREATE OR REPLACE FUNCTION public.accept_open_challenge(
  p_challenge_id uuid,
  p_joiner_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge  public.challenges%ROWTYPE;
  v_session_id uuid;
BEGIN
  -- Step 1: Atomically claim the challenge.
  -- UPDATE is atomic: WHERE evaluates and lock is acquired in one shot.
  -- If another transaction already changed status, this UPDATE hits 0 rows.
  UPDATE public.challenges
  SET    status       = 'accepted',
         challenged_id = p_joiner_id
  WHERE  id           = p_challenge_id
    AND  status       = 'pending'
    AND  is_open      = true
    AND  expires_at   > now()
  RETURNING * INTO v_challenge;

  -- If 0 rows updated: challenge is gone (already accepted, expired, or invalid)
  IF v_challenge.id IS NULL THEN
    RAISE EXCEPTION 'challenge_already_accepted'
      USING DETAIL = 'Diese Herausforderung wurde bereits von einem anderen Spieler angenommen.',
            HINT   = 'already_accepted';
  END IF;

  -- Step 2: Create the game session (inside the same transaction)
  INSERT INTO public.game_sessions (
    mode, status, category, question_count,
    time_per_question, current_question_index, host_id
  ) VALUES (
    'challenge', 'waiting', v_challenge.category, v_challenge.question_count,
    20, 0, v_challenge.challenger_id
  )
  RETURNING id INTO v_session_id;

  -- Step 3: Link session to challenge
  UPDATE public.challenges
  SET    session_id = v_session_id
  WHERE  id         = v_challenge.id;

  -- Step 4: Notify challenger
  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  SELECT
    v_challenge.challenger_id,
    'challenge_accepted',
    'Jemand hat deine offene Herausforderung angenommen!',
    (SELECT username FROM public.profiles WHERE id = p_joiner_id) || ' spielt gegen dich!',
    jsonb_build_object('session_id', v_session_id),
    false;

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;
```

### Pattern 2: Targeted Challenge Accept (same primitive, different guard)

For `respondToChallenge(accept=true)` — the targeted (non-open) challenge path:

```sql
CREATE OR REPLACE FUNCTION public.accept_targeted_challenge(
  p_challenge_id uuid,
  p_acceptor_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge  public.challenges%ROWTYPE;
  v_session_id uuid;
BEGIN
  -- Atomically claim: must be pending AND addressed to this specific user
  UPDATE public.challenges
  SET    status = 'accepted'
  WHERE  id           = p_challenge_id
    AND  status       = 'pending'
    AND  challenged_id = p_acceptor_id
    AND  expires_at   > now()
  RETURNING * INTO v_challenge;

  IF v_challenge.id IS NULL THEN
    RAISE EXCEPTION 'challenge_not_claimable'
      USING DETAIL = 'Herausforderung nicht mehr verfügbar.',
            HINT   = 'already_accepted';
  END IF;

  INSERT INTO public.game_sessions (
    mode, status, category, question_count,
    time_per_question, current_question_index, host_id
  ) VALUES (
    'challenge', 'waiting', v_challenge.category, v_challenge.question_count,
    20, 0, v_challenge.challenger_id
  )
  RETURNING id INTO v_session_id;

  UPDATE public.challenges SET session_id = v_session_id WHERE id = v_challenge.id;

  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  SELECT
    v_challenge.challenger_id,
    'challenge_accepted',
    'Herausforderung angenommen!',
    (SELECT username FROM public.profiles WHERE id = p_acceptor_id) || ' hat deine Herausforderung angenommen!',
    jsonb_build_object('session_id', v_session_id),
    false;

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;
```

### Pattern 3: Tournament Start (same primitive, status guard on tournament)

```sql
CREATE OR REPLACE FUNCTION public.start_tournament(
  p_tournament_id uuid,
  p_starter_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_session_id uuid;
  v_participant record;
BEGIN
  -- Atomically claim: must still be 'registering'
  UPDATE public.tournaments
  SET    status     = 'active',
         started_at = now(),
         current_round = 1
  WHERE  id     = p_tournament_id
    AND  status  = 'registering'
  RETURNING * INTO v_tournament;

  IF v_tournament.id IS NULL THEN
    RAISE EXCEPTION 'tournament_already_started'
      USING DETAIL = 'Dieses Turnier wurde bereits gestartet.',
            HINT   = 'already_started';
  END IF;

  INSERT INTO public.game_sessions (
    mode, status, category, question_count,
    time_per_question, current_question_index, host_id, tournament_id
  ) VALUES (
    'tournament', 'active', v_tournament.category, v_tournament.question_count,
    20, 0, p_starter_id, v_tournament.id
  )
  RETURNING id INTO v_session_id;

  FOR v_participant IN
    SELECT user_id FROM public.tournament_participants
    WHERE  tournament_id = p_tournament_id
  LOOP
    INSERT INTO public.game_players (
      session_id, user_id, score, correct_answers,
      wrong_answers, is_ready, is_finished
    ) VALUES (
      v_session_id, v_participant.user_id, 0, 0, 0, true, false
    );
  END LOOP;

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;
```

### Pattern 4: TypeScript client call with race condition error handling

```typescript
// Source: PostgREST docs — RAISE EXCEPTION returns HTTP 400 with code 'P0001'
// error.message contains the exception message string
// error.hint contains the USING HINT value

const joinOpenChallenge = async (challenge: Challenge) => {
  if (!user) return;
  setLoading(true);
  try {
    const { data, error } = await supabase.rpc('accept_open_challenge', {
      p_challenge_id: challenge.id,
      p_joiner_id: user.id,
    });

    if (error) {
      // Race condition: another player claimed this challenge first
      if (error.hint === 'already_accepted') {
        setError('Diese Herausforderung wurde bereits angenommen. Bitte wähle eine andere.');
        fetchChallenges(); // Refresh the list
        return;
      }
      throw error; // Unexpected error — re-throw
    }

    if (data?.session_id) {
      navigate(`/game/${data.session_id}`);
    }
  } catch (err: any) {
    setError(err.message || 'Fehler beim Beitreten der Herausforderung');
  } finally {
    setLoading(false);
  }
};
```

### Anti-Patterns to Avoid

- **Read-then-write without atomicity:** The current code does `SELECT` (implicit in .eq filter) then separate `UPDATE`. This is the bug. Never use client-side "check then act" for shared resources.
- **Using `SECURITY DEFINER` without checking auth.uid():** The RPC functions above use `SECURITY DEFINER` (run as the function owner) which bypasses RLS. The `p_joiner_id` parameter must equal `auth.uid()` — this check should be enforced either inside the function or via the existing RLS `is_open = true and auth.uid() is not null` policy. For safety, add an explicit check inside the function.
- **Unique constraint as sole protection without user feedback:** A UNIQUE constraint on `(challenges.id, session_id)` doesn't prevent duplicate sessions — it would prevent linking the same session twice, not the actual race condition.
- **Client-side debounce/disable-button as the fix:** This prevents accidental double-clicks by the same user but does nothing for two different users accepting simultaneously.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic check-and-update | Client-side lock, flag check, or timestamp comparison | PostgreSQL UPDATE...WHERE...RETURNING | Row-level locking is built into PostgreSQL; client-side solutions cannot be atomic |
| Multi-step DB transaction | Sequential supabase-js calls | plpgsql RPC function | supabase-js has no transaction support; only the DB can guarantee atomicity |
| "Already claimed" error detection | Polling or re-querying after a failed update | RAISE EXCEPTION + `error.hint` check on client | RAISE EXCEPTION propagates through PostgREST as HTTP 400 with structured fields |

**Key insight:** supabase-js is a PostgREST client. PostgREST does not expose SQL transactions to the caller. The only way to run multiple statements atomically is inside a plpgsql function called via `.rpc()`.

---

## Common Pitfalls

### Pitfall 1: SECURITY DEFINER bypasses RLS — must validate caller identity
**What goes wrong:** `SECURITY DEFINER` functions run as the DB role (postgres), not the calling user. RLS policies are not enforced. A malicious client could pass any `p_joiner_id`.
**Why it happens:** SECURITY DEFINER is needed to INSERT into `game_sessions` (which requires host privileges) and `notifications`.
**How to avoid:** Add `IF p_joiner_id != auth.uid() THEN RAISE EXCEPTION` at the top of each function, or use `SECURITY INVOKER` and adjust the RLS policy on `game_sessions` to allow any authenticated user to insert a session (current policy already allows this: `auth.uid() is not null`). Since the existing schema uses `SECURITY DEFINER` for `update_player_stats`, the convention is already established.
**Warning signs:** Test by calling the RPC with a fabricated `p_joiner_id` in a separate browser tab.

### Pitfall 2: schema.sql must be manually applied in Supabase dashboard
**What goes wrong:** New functions added to `schema.sql` do not auto-deploy. The developer forgets to run the SQL in the Supabase SQL editor.
**Why it happens:** This project has no migration tooling (Out of Scope per REQUIREMENTS.md).
**How to avoid:** REQUIREMENTS.md states "DB-Schema-Änderungen: Zu riskant ohne Migrations-Tooling" — however, adding new FUNCTIONS (not tables) is safe since functions are idempotent with `CREATE OR REPLACE`. The plan should include a verification step: call the RPC and confirm the response shape.
**Warning signs:** `PGRST202 — Could not find the function` error from supabase-js means the function hasn't been applied yet.

### Pitfall 3: error.hint is the reliable discriminator, not error.message
**What goes wrong:** Checking `error.message === 'challenge_already_accepted'` is brittle — the message is the RAISE EXCEPTION first argument (a string), and PostgREST passes it through unchanged. But the `HINT` field (set via `USING HINT = '...'`) is a separate structured field that is less likely to collide with other errors.
**Why it happens:** PostgREST returns `{ code, message, details, hint }`. The `code` is always `P0001` for any unhandled plpgsql RAISE EXCEPTION, so it can't distinguish between different application errors. `hint` is the right discriminator.
**How to avoid:** Use short, stable, machine-readable strings in `USING HINT` (e.g., `'already_accepted'`), and check `error.hint === 'already_accepted'` on the client.
**Warning signs:** If you check `error.code`, all custom exceptions look like `P0001`.

### Pitfall 4: Realtime triggers fetchChallenges() after RPC completes — no extra work needed
**What goes wrong:** Developer thinks they need to manually push a Realtime event after the RPC updates the challenge status.
**Why it happens:** The existing Realtime subscription in ChallengePage listens to `postgres_changes` on the `challenges` table. Any `UPDATE` to that table (including the one inside the RPC function) will trigger the subscription automatically.
**How to avoid:** No extra Realtime code needed. The `challenges` table is already in `supabase_realtime` publication (`alter publication supabase_realtime add table public.challenges`). After a successful RPC call, the challenger's client will automatically receive the update and can navigate to the game.
**Warning signs:** If you add manual channel.send() calls after the RPC, you'll get duplicate events.

### Pitfall 5: The `expired` challenge status is not enforced DB-side
**What goes wrong:** The `expires_at` column exists but there is no scheduled job or trigger to set `status = 'expired'` when time passes. Expired challenges remain `pending` in the DB and the RPC's `expires_at > now()` guard prevents accepting them, but they still appear in the UI until the next `fetchChallenges()` call.
**Why it happens:** No background worker or pg_cron job exists in this schema.
**How to avoid:** The RPC's guard (`expires_at > now()`) correctly rejects expired challenges at the DB level. The UI already filters with `.eq('status', 'pending')`. This is acceptable for Phase 1 — expiry cleanup is deferred.
**Warning signs:** UI shows old challenges; clicking "Mitspielen" returns `challenge_already_accepted` hint even though nobody accepted it.

---

## Code Examples

### Full working RPC for open challenge (production-ready)

```sql
-- Source: PostgreSQL plpgsql docs + PostgREST error handling conventions
-- Add to: supabase/schema.sql

CREATE OR REPLACE FUNCTION public.accept_open_challenge(
  p_challenge_id uuid,
  p_joiner_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge  public.challenges%ROWTYPE;
  v_session_id uuid;
  v_joiner_name text;
BEGIN
  -- Security: caller must be the joiner
  IF p_joiner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized'
      USING HINT = 'unauthorized';
  END IF;

  -- Atomic claim: UPDATE only if still pending, open, not expired
  UPDATE public.challenges
  SET    status        = 'accepted',
         challenged_id = p_joiner_id
  WHERE  id            = p_challenge_id
    AND  status        = 'pending'
    AND  is_open       = true
    AND  challenger_id != p_joiner_id
    AND  expires_at    > now()
  RETURNING * INTO v_challenge;

  -- 0 rows updated = race condition lost (or invalid challenge)
  IF v_challenge.id IS NULL THEN
    RAISE EXCEPTION 'challenge_already_accepted'
      USING DETAIL = 'Diese Herausforderung wurde bereits von einem anderen Spieler angenommen.',
            HINT   = 'already_accepted';
  END IF;

  -- Create session (same transaction — rolls back if this fails)
  INSERT INTO public.game_sessions (
    mode, status, category, question_count,
    time_per_question, current_question_index, host_id
  ) VALUES (
    'challenge', 'waiting',
    v_challenge.category, v_challenge.question_count,
    20, 0, v_challenge.challenger_id
  )
  RETURNING id INTO v_session_id;

  -- Link session to challenge
  UPDATE public.challenges
  SET    session_id = v_session_id
  WHERE  id = v_challenge.id;

  -- Notify challenger
  SELECT username INTO v_joiner_name FROM public.profiles WHERE id = p_joiner_id;
  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  VALUES (
    v_challenge.challenger_id,
    'challenge_accepted',
    'Jemand hat deine offene Herausforderung angenommen!',
    v_joiner_name || ' spielt gegen dich!',
    jsonb_build_object('session_id', v_session_id),
    false
  );

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;
```

### TypeScript: calling the RPC and handling all outcomes

```typescript
// In ChallengePage.tsx — replaces joinOpenChallenge()
const joinOpenChallenge = async (challenge: Challenge) => {
  if (!user) return;
  setLoading(true);
  setError('');

  const { data, error } = await supabase.rpc('accept_open_challenge', {
    p_challenge_id: challenge.id,
    p_joiner_id: user.id,
  });

  setLoading(false);

  if (error) {
    if (error.hint === 'already_accepted') {
      setError('Zu spät! Jemand anderes hat diese Herausforderung angenommen.');
      fetchChallenges(); // Refresh so the card disappears
      return;
    }
    if (error.hint === 'unauthorized') {
      setError('Nicht autorisiert.');
      return;
    }
    // Unexpected DB error
    setError(error.message || 'Unbekannter Fehler');
    return;
  }

  if (data?.session_id) {
    navigate(`/game/${data.session_id}`);
  }
};
```

### TypeScript: the error shape from supabase-js v2

```typescript
// error returned from supabase.rpc() on RAISE EXCEPTION:
// {
//   code: 'P0001',           // always P0001 for plpgsql RAISE EXCEPTION
//   message: 'challenge_already_accepted',  // the RAISE first arg
//   details: 'Diese Herausforderung ...',   // USING DETAIL
//   hint: 'already_accepted'               // USING HINT — best discriminator
// }
//
// On PGRST202 (function not found):
// { code: 'PGRST202', message: 'Could not find the function ...' }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side check-then-update (current code) | Single atomic RPC function | Immediate fix | Eliminates duplicate sessions |
| Sequential supabase-js calls for multi-step ops | plpgsql function via .rpc() | Supabase standard practice | Atomicity, fewer round-trips |
| Catching errors with `catch (err: any)` | Destructured `{ data, error }` from supabase-js | supabase-js v2 design | No exceptions thrown — errors are values |

**Deprecated/outdated in current code:**
- The current `joinOpenChallenge()` pattern (insert session first, then update challenge) must be replaced entirely — it cannot be made safe without a transaction.

---

## Open Questions

1. **Should `game_players` rows be inserted inside the RPC or in a separate step?**
   - What we know: The current `joinSession()` in gameStore inserts into `game_players` when a player navigates to `/game/:id`. This happens after redirect.
   - What's unclear: If we insert `game_players` inside the RPC, the gameStore's `joinSession()` would find the row already exists and skip insertion (it checks first). This is safe due to the `unique(session_id, user_id)` constraint.
   - Recommendation: Do NOT insert `game_players` inside the RPC for Phase 1. Keep existing gameStore behavior to minimize scope. The RPC returns `session_id` and the client navigates; `joinSession()` handles player registration.

2. **Does the `respondToChallenge()` targeted-challenge path also have a race condition?**
   - What we know: Two players cannot both be `challenged_id` for the same targeted challenge (it's a specific 1:1 challenge). The race is lower probability.
   - What's unclear: If the challenger double-clicks or has two browser tabs, both could trigger `respondToChallenge(accept=true)` for the same challenge.
   - Recommendation: Apply the same atomic UPDATE pattern via a second RPC function `accept_targeted_challenge`. Treat it as part of Phase 1 since it's the same code pattern.

---

## Environment Availability

Step 2.6: SKIPPED — this phase adds SQL functions to an existing Supabase project and modifies TypeScript source files. No new CLI tools, runtimes, or external services are required beyond the already-configured Supabase project and Node.js environment.

---

## Validation Architecture

> nyquist_validation is explicitly `false` in .planning/config.json — this section is skipped.

---

## Sources

### Primary (HIGH confidence)
- PostgreSQL docs — plpgsql implicit transactions, RAISE EXCEPTION, UPDATE...RETURNING atomicity: https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html
- PostgREST error docs — RAISE EXCEPTION returns HTTP 400, error shape `{ code, message, details, hint }`, P0001 is the default SQLSTATE: https://github.com/PostgREST/postgrest/issues/2134
- supabase/schema.sql (project file) — confirmed existing patterns: SECURITY DEFINER, plpgsql, no transaction tooling

### Secondary (MEDIUM confidence)
- Makerkit one-time tokens pattern — FOR UPDATE + RAISE EXCEPTION + TypeScript error.hint discriminator: https://makerkit.dev/blog/tutorials/one-time-tokens-supabase-postgres
- Marmelab: Transactions and RLS in Supabase — confirmed supabase-js has no transaction support, RPC is the correct alternative: https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html
- DEV Community: Winning Race Conditions with PostgreSQL — UPDATE WHERE as atomic primitive: https://dev.to/mistval/winning-race-conditions-with-postgresql-54gn
- Supabase discussion on SERIALIZABLE isolation — confirmed UPDATE WHERE approach is more appropriate than SERIALIZABLE for this pattern: https://github.com/orgs/supabase/discussions/30334

### Tertiary (LOW confidence)
- None — all critical claims verified with official or primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions verified with `npm view`; supabase-js v2 API confirmed in project
- Architecture: HIGH — PostgreSQL UPDATE atomicity is a fundamental DB guarantee; plpgsql transaction behavior is well-documented
- Pitfalls: HIGH (SECURITY DEFINER, Realtime behavior) / MEDIUM (expires_at pitfall — not explicitly tested)
- Error handling: HIGH — `error.hint` discriminator confirmed via PostgREST issues and official error code docs

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 (PostgreSQL/Supabase core behavior is stable; supabase-js major version unchanged)
