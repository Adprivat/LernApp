-- ============================================================
-- LernApp - Supabase Database Schema
-- ============================================================
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  total_score integer not null default 0,
  games_played integer not null default 0,
  games_won integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  is_admin boolean not null default false,
  is_online boolean not null default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Admins can delete profiles"
  on public.profiles for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- GAME SESSIONS
-- ============================================================
create table if not exists public.game_sessions (
  id uuid default uuid_generate_v4() primary key,
  mode text not null check (mode in ('solo', 'challenge', 'group', 'tournament')),
  status text not null default 'waiting' check (status in ('waiting', 'starting', 'active', 'finished')),
  category text not null,
  question_count integer not null default 10,
  time_per_question integer not null default 20,
  current_question_index integer not null default 0,
  question_start_time timestamptz,
  host_id uuid references public.profiles(id) on delete set null,
  tournament_id uuid,
  max_players integer default 4,
  created_at timestamptz default now(),
  finished_at timestamptz
);

alter table public.game_sessions enable row level security;

create policy "Game sessions are viewable by everyone"
  on public.game_sessions for select using (true);

create policy "Authenticated users can create sessions"
  on public.game_sessions for insert with check (auth.uid() is not null);

create policy "Host can update session"
  on public.game_sessions for update using (
    host_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- GAME PLAYERS
-- ============================================================
create table if not exists public.game_players (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.game_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team integer,
  score integer not null default 0,
  correct_answers integer not null default 0,
  wrong_answers integer not null default 0,
  is_ready boolean not null default false,
  is_finished boolean not null default false,
  rank integer,
  joined_at timestamptz default now(),
  unique(session_id, user_id)
);

alter table public.game_players enable row level security;

create policy "Game players are viewable by everyone"
  on public.game_players for select using (true);

create policy "Authenticated users can join games"
  on public.game_players for insert with check (auth.uid() = user_id);

create policy "Players can update own record"
  on public.game_players for update using (user_id = auth.uid());

-- ============================================================
-- GAME ANSWERS
-- ============================================================
create table if not exists public.game_answers (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.game_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  question_index integer not null,
  answer_index integer not null,
  is_correct boolean not null,
  time_taken_ms integer not null,
  points_earned integer not null default 0,
  answered_at timestamptz default now(),
  unique(session_id, user_id, question_index)
);

alter table public.game_answers enable row level security;

create policy "Answers viewable in own sessions"
  on public.game_answers for select using (auth.uid() is not null);

create policy "Users can insert own answers"
  on public.game_answers for insert with check (auth.uid() = user_id);

-- ============================================================
-- CHALLENGES
-- ============================================================
create table if not exists public.challenges (
  id uuid default uuid_generate_v4() primary key,
  challenger_id uuid references public.profiles(id) on delete cascade not null,
  challenged_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.game_sessions(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'completed')),
  category text not null,
  question_count integer not null default 10,
  is_open boolean not null default false,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

alter table public.challenges enable row level security;

create policy "Challenges viewable by participants and open ones"
  on public.challenges for select using (
    is_open = true or
    challenger_id = auth.uid() or
    challenged_id = auth.uid()
  );

create policy "Authenticated users can create challenges"
  on public.challenges for insert with check (auth.uid() = challenger_id);

create policy "Challenged user or challenger can update"
  on public.challenges for update using (
    challenged_id = auth.uid() or challenger_id = auth.uid() or
    (is_open = true and auth.uid() is not null)
  );

-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table if not exists public.tournaments (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  status text not null default 'registering' check (status in ('registering', 'active', 'finished')),
  max_players integer not null default 8,
  category text not null,
  question_count integer not null default 10,
  current_round integer not null default 0,
  created_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);

alter table public.tournaments enable row level security;

create policy "Tournaments are viewable by everyone"
  on public.tournaments for select using (true);

create policy "Authenticated users can create tournaments"
  on public.tournaments for insert with check (auth.uid() is not null);

create policy "Authenticated users can update tournaments"
  on public.tournaments for update using (auth.uid() is not null);

-- ============================================================
-- TOURNAMENT PARTICIPANTS
-- ============================================================
create table if not exists public.tournament_participants (
  id uuid default uuid_generate_v4() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_eliminated boolean not null default false,
  current_round integer not null default 0,
  total_score integer not null default 0,
  joined_at timestamptz default now(),
  unique(tournament_id, user_id)
);

alter table public.tournament_participants enable row level security;

create policy "Tournament participants viewable by everyone"
  on public.tournament_participants for select using (true);

create policy "Users can register for tournaments"
  on public.tournament_participants for insert with check (auth.uid() = user_id);

create policy "Users can update own participation"
  on public.tournament_participants for update using (user_id = auth.uid());

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
create table if not exists public.achievements (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  name text not null,
  description text not null,
  icon text not null,
  category text not null check (category in ('games', 'score', 'streak', 'social', 'special')),
  requirement_value integer not null default 1
);

alter table public.achievements enable row level security;

create policy "Achievements viewable by everyone"
  on public.achievements for select using (true);

-- ============================================================
-- USER ACHIEVEMENTS
-- ============================================================
create table if not exists public.user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id uuid references public.achievements(id) on delete cascade not null,
  earned_at timestamptz default now(),
  unique(user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

create policy "User achievements viewable by everyone"
  on public.user_achievements for select using (true);

create policy "System can insert achievements"
  on public.user_achievements for insert with check (auth.uid() is not null);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.game_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 200),
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "Chat messages viewable by session participants"
  on public.chat_messages for select using (auth.uid() is not null);

create policy "Authenticated users can send messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('challenge_received', 'challenge_accepted', 'challenge_declined', 'tournament_start', 'achievement_earned', 'game_invite')),
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select using (user_id = auth.uid());

create policy "Authenticated users can create notifications"
  on public.notifications for insert with check (auth.uid() is not null);

create policy "Users can update own notifications"
  on public.notifications for update using (user_id = auth.uid());

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================
-- Enable realtime for key tables
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_participants;

-- ============================================================
-- FUNCTION: update_player_stats
-- ============================================================
create or replace function public.update_player_stats(
  p_user_id uuid,
  p_score integer,
  p_won boolean,
  p_correct integer
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_streak integer;
  v_best_streak integer;
begin
  select current_streak, best_streak
  into v_current_streak, v_best_streak
  from public.profiles
  where id = p_user_id;

  -- Update streak
  if p_won then
    v_current_streak := v_current_streak + 1;
    if v_current_streak > v_best_streak then
      v_best_streak := v_current_streak;
    end if;
  else
    v_current_streak := 0;
  end if;

  update public.profiles
  set
    total_score = total_score + p_score,
    games_played = games_played + 1,
    games_won = games_won + (case when p_won then 1 else 0 end),
    current_streak = v_current_streak,
    best_streak = v_best_streak
  where id = p_user_id;

  -- Check and award achievements
  perform public.check_achievements(p_user_id);
end;
$$;

-- ============================================================
-- FUNCTION: check_achievements
-- ============================================================
create or replace function public.check_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_profile public.profiles%rowtype;
  v_achievement public.achievements%rowtype;
begin
  select * into v_profile from public.profiles where id = p_user_id;

  for v_achievement in select * from public.achievements loop
    -- Skip if already earned
    if exists (
      select 1 from public.user_achievements
      where user_id = p_user_id and achievement_id = v_achievement.id
    ) then
      continue;
    end if;

    -- Check conditions
    if (v_achievement.key = 'first_game' and v_profile.games_played >= 1) or
       (v_achievement.key = 'games_10' and v_profile.games_played >= 10) or
       (v_achievement.key = 'games_50' and v_profile.games_played >= 50) or
       (v_achievement.key = 'games_100' and v_profile.games_played >= 100) or
       (v_achievement.key = 'first_win' and v_profile.games_won >= 1) or
       (v_achievement.key = 'wins_10' and v_profile.games_won >= 10) or
       (v_achievement.key = 'wins_50' and v_profile.games_won >= 50) or
       (v_achievement.key = 'score_1000' and v_profile.total_score >= 1000) or
       (v_achievement.key = 'score_5000' and v_profile.total_score >= 5000) or
       (v_achievement.key = 'score_10000' and v_profile.total_score >= 10000) or
       (v_achievement.key = 'streak_3' and v_profile.best_streak >= 3) or
       (v_achievement.key = 'streak_5' and v_profile.best_streak >= 5) or
       (v_achievement.key = 'streak_10' and v_profile.best_streak >= 10)
    then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user_id, v_achievement.id);

      -- Send notification
      insert into public.notifications (user_id, type, title, message, data)
      values (
        p_user_id,
        'achievement_earned',
        'Errungenschaft freigeschaltet!',
        'Du hast "' || v_achievement.name || '" freigeschaltet!',
        jsonb_build_object('achievement_id', v_achievement.id)
      );
    end if;
  end loop;
end;
$$;

-- ============================================================
-- SEED: ACHIEVEMENTS
-- ============================================================
insert into public.achievements (key, name, description, icon, category, requirement_value) values
  ('first_game', 'Erster Start', 'Spiele dein erstes Spiel', '🎮', 'games', 1),
  ('games_10', 'Fleißiger Lerner', 'Spiele 10 Spiele', '📚', 'games', 10),
  ('games_50', 'Erfahrener Spieler', 'Spiele 50 Spiele', '🎯', 'games', 50),
  ('games_100', 'Veteran', 'Spiele 100 Spiele', '🏅', 'games', 100),
  ('first_win', 'Erster Sieg', 'Gewinne dein erstes Spiel', '🏆', 'games', 1),
  ('wins_10', 'Gewinner', 'Gewinne 10 Spiele', '⭐', 'games', 10),
  ('wins_50', 'Champion', 'Gewinne 50 Spiele', '👑', 'games', 50),
  ('score_1000', 'Aufsteiger', 'Erreiche 1.000 Punkte', '🌟', 'score', 1000),
  ('score_5000', 'Experte', 'Erreiche 5.000 Punkte', '💎', 'score', 5000),
  ('score_10000', 'Meister', 'Erreiche 10.000 Punkte', '🔥', 'score', 10000),
  ('streak_3', 'Auf Kurs', '3 Siege in Folge', '⚡', 'streak', 3),
  ('streak_5', 'Heißer Lauf', '5 Siege in Folge', '🚀', 'streak', 5),
  ('streak_10', 'Unaufhaltsam', '10 Siege in Folge', '💥', 'streak', 10)
on conflict (key) do nothing;
