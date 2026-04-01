-- Restrict chat_messages RLS to session participants only
-- Previously: any authenticated user could read all chat messages

-- Drop old permissive policies
DROP POLICY IF EXISTS "Chat messages viewable by session participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.chat_messages;

-- SELECT: only players of the session can read messages
CREATE POLICY "Chat messages viewable by session participants"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players gp
      WHERE gp.session_id = chat_messages.session_id
        AND gp.user_id = auth.uid()
    )
  );

-- INSERT: only players of the session can send messages
CREATE POLICY "Session participants can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.game_players gp
      WHERE gp.session_id = chat_messages.session_id
        AND gp.user_id = auth.uid()
    )
  );
