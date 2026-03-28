import React, { useEffect, useState } from 'react';
import { Star, Target, Trophy, TrendingUp, Zap, BookOpen, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { UserAchievement } from '@/types';

export function ProfilePage() {
  const { user } = useAuthStore();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [recentGames, setRecentGames] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .then(({ data }) => setAchievements(data || []));

    supabase
      .from('game_players')
      .select('*, session:game_sessions(mode, category, status, finished_at, question_count)')
      .eq('user_id', user.id)
      .not('session', 'is', null)
      .order('id', { ascending: false })
      .limit(10)
      .then(({ data }) => setRecentGames(data?.filter(g => g.session?.status === 'finished') || []));
  }, [user]);

  if (!user) return null;

  const winRate = user.games_played > 0
    ? Math.round((user.games_won / user.games_played) * 100)
    : 0;

  const stats = [
    { label: 'Gesamtpunkte', value: user.total_score.toLocaleString(), icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Spiele gespielt', value: user.games_played, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Siege', value: user.games_won, icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Siegrate', value: `${winRate}%`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Aktuelle Serie', value: `${user.current_streak}🔥`, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Beste Serie', value: `${user.best_streak}⭐`, icon: TrendingUp, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header */}
      <Card className="mb-6">
        <div className="flex items-center gap-6">
          <Avatar username={user.username} size="xl" isOnline />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{user.username}</h1>
              {user.is_admin && (
                <Badge variant="warning">Admin</Badge>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Mitglied seit {new Date(user.created_at).toLocaleDateString('de-DE')}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm text-slate-300">
                <span className="font-bold text-white">{achievements.length}</span> Errungenschaften
              </span>
              <span className="text-sm text-slate-300">
                <span className="font-bold text-white">{user.total_score.toLocaleString()}</span> Punkte
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Star size={18} className="text-yellow-400" />
            Statistiken
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`${bg} border border-current/10 rounded-2xl p-4 text-center`}>
                <Icon size={20} className={`${color} mx-auto mb-2`} />
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-xs text-slate-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Recent games */}
          <h2 className="font-bold text-white mb-4">Letzte Spiele</h2>
          {recentGames.length === 0 ? (
            <Card className="text-center py-8 text-slate-400">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Spiele</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {recentGames.map((game, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-xl border border-slate-700">
                  <div className="text-2xl">
                    {game.session?.mode === 'solo' ? '📚' :
                     game.session?.mode === 'challenge' ? '⚔️' :
                     game.session?.mode === 'group' ? '👥' : '🏆'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white capitalize">{game.session?.mode}</span>
                      <Badge variant="default" size="sm">{game.session?.category}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(game.session?.finished_at || '').toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-400">{game.score}</div>
                    <div className="text-xs text-slate-400">Punkte</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Award size={18} className="text-purple-400" />
            Errungenschaften ({achievements.length})
          </h2>
          {achievements.length === 0 ? (
            <Card className="text-center py-8 text-slate-400">
              <Award size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Errungenschaften</p>
              <p className="text-xs mt-1">Spiele mehr Spiele!</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {achievements.map(ua => (
                <div key={ua.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-slate-700">
                  <div className="text-2xl">{ua.achievement?.icon || '🏅'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{ua.achievement?.name}</p>
                    <p className="text-xs text-slate-400 leading-tight mt-0.5">{ua.achievement?.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
