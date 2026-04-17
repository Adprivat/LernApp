export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  total_score: number;
  games_played: number;
  games_won: number;
  current_streak: number;
  best_streak: number;
  is_admin: boolean;
  is_online: boolean;
  hide_from_leaderboard: boolean;
  last_seen: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'feature' | 'bugfix' | 'wartung' | 'info';
  is_published: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionCategory {
  id: string;
  key: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Subject {
  id: string;
  key: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Question {
  id: string;
  category: string;
  category_id?: string;
  question: string;
  answers: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  sort_order?: number;
  is_active?: boolean;
}

export interface GameSession {
  id: string;
  mode: 'solo' | 'challenge' | 'group' | 'tournament';
  status: 'waiting' | 'starting' | 'active' | 'finished';
  category: string;
  question_count: number;
  time_per_question: number;
  current_question_index: number;
  question_start_time?: string;
  host_id: string;
  tournament_id?: string;
  created_at: string;
  finished_at?: string;
}

export interface GamePlayer {
  id: string;
  session_id: string;
  user_id: string;
  team?: number;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  is_ready: boolean;
  is_finished: boolean;
  rank?: number;
  profile?: Profile;
}

export interface GameAnswer {
  id: string;
  session_id: string;
  user_id: string;
  question_index: number;
  answer_index: number;
  is_correct: boolean;
  time_taken_ms: number;
  points_earned: number;
  answered_at: string;
}

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id?: string;
  session_id?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed';
  category: string;
  question_count: number;
  is_open: boolean;
  created_at: string;
  expires_at: string;
  challenger?: Profile;
  challenged?: Profile;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'registering' | 'active' | 'finished';
  max_players: number;
  category: string;
  question_count: number;
  current_round: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  is_eliminated: boolean;
  current_round: number;
  total_score: number;
  profile?: Profile;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'games' | 'score' | 'streak' | 'social' | 'special';
  requirement_value: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'challenge_received' | 'challenge_accepted' | 'challenge_declined' | 'tournament_start' | 'tournament_created' | 'tournament_end' | 'achievement_earned' | 'game_invite';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  user?: Profile;
  friend?: Profile;
}

