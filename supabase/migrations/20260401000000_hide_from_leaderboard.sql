-- Add hide_from_leaderboard column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_from_leaderboard boolean NOT NULL DEFAULT false;
