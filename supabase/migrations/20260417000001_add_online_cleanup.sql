-- Cleanup function: sets is_online=false for users not seen in >2 minutes.
-- Called by each client's heartbeat so no pg_cron needed.
CREATE OR REPLACE FUNCTION public.cleanup_stale_online_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_online = false
  WHERE is_online = true
    AND last_seen < now() - interval '2 minutes';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_online_status() TO authenticated;
