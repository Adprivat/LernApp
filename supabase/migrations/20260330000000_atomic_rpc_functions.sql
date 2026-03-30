-- Migration: Atomic RPC functions for race condition fix
-- Phase 1: Race Condition Fix (BUG-01)
-- These replace the racy client-side multi-step flows with single atomic transactions.

-- ============================================================
-- FUNCTION: accept_open_challenge
-- ============================================================
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

  -- Atomic claim: UPDATE only if still pending, open, not expired, not self-join
  UPDATE public.challenges
  SET    status        = 'accepted',
         challenged_id = p_joiner_id
  WHERE  id            = p_challenge_id
    AND  status        = 'pending'
    AND  is_open       = true
    AND  challenger_id != p_joiner_id
    AND  expires_at    > now()
  RETURNING * INTO v_challenge;

  -- 0 rows updated = race condition lost (or invalid/expired challenge)
  IF v_challenge.id IS NULL THEN
    RAISE EXCEPTION 'challenge_already_accepted'
      USING DETAIL = 'Diese Herausforderung wurde bereits von einem anderen Spieler angenommen.',
            HINT   = 'already_accepted';
  END IF;

  -- Create game session (same transaction — rolls back if this fails)
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

  -- Look up joiner name and notify challenger
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

-- ============================================================
-- FUNCTION: accept_targeted_challenge
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_targeted_challenge(
  p_challenge_id uuid,
  p_acceptor_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge    public.challenges%ROWTYPE;
  v_session_id   uuid;
  v_acceptor_name text;
BEGIN
  -- Security: caller must be the acceptor
  IF p_acceptor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized'
      USING HINT = 'unauthorized';
  END IF;

  -- Atomic claim: must be pending AND specifically addressed to this user
  UPDATE public.challenges
  SET    status = 'accepted'
  WHERE  id           = p_challenge_id
    AND  status       = 'pending'
    AND  challenged_id = p_acceptor_id
    AND  expires_at   > now()
  RETURNING * INTO v_challenge;

  -- 0 rows updated = not available (already accepted, declined, expired, or wrong user)
  IF v_challenge.id IS NULL THEN
    RAISE EXCEPTION 'challenge_not_claimable'
      USING DETAIL = 'Herausforderung nicht mehr verfuegbar.',
            HINT   = 'already_accepted';
  END IF;

  -- Create game session (same transaction)
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

  -- Look up acceptor name and notify challenger
  SELECT username INTO v_acceptor_name FROM public.profiles WHERE id = p_acceptor_id;
  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
  VALUES (
    v_challenge.challenger_id,
    'challenge_accepted',
    'Herausforderung angenommen!',
    v_acceptor_name || ' hat deine Herausforderung angenommen!',
    jsonb_build_object('session_id', v_session_id),
    false
  );

  RETURN jsonb_build_object('session_id', v_session_id);
END;
$$;

-- ============================================================
-- FUNCTION: start_tournament
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_tournament(
  p_tournament_id uuid,
  p_starter_id    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament  public.tournaments%ROWTYPE;
  v_session_id  uuid;
  v_participant record;
BEGIN
  -- Security: caller must be the starter
  IF p_starter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized'
      USING HINT = 'unauthorized';
  END IF;

  -- Atomic claim: must still be in 'registering' state
  UPDATE public.tournaments
  SET    status        = 'active',
         started_at    = now(),
         current_round = 1
  WHERE  id     = p_tournament_id
    AND  status  = 'registering'
  RETURNING * INTO v_tournament;

  -- 0 rows updated = tournament already started or does not exist
  IF v_tournament.id IS NULL THEN
    RAISE EXCEPTION 'tournament_already_started'
      USING DETAIL = 'Dieses Turnier wurde bereits gestartet.',
            HINT   = 'already_started';
  END IF;

  -- Create game session for this tournament round (same transaction)
  INSERT INTO public.game_sessions (
    mode, status, category, question_count,
    time_per_question, current_question_index, host_id, tournament_id
  ) VALUES (
    'tournament', 'active',
    v_tournament.category, v_tournament.question_count,
    20, 0, p_starter_id, v_tournament.id
  )
  RETURNING id INTO v_session_id;

  -- Insert game_players for all pre-registered tournament participants
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
