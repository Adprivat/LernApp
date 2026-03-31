import React, { useEffect, useState } from 'react';
import { Crown, Star, Target, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Profile } from '@/types';

type SortBy = 'total_score' | 'games_won' | 'best_streak' | 'games_played';

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [players, setPlayers] = useState<Profile[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('total_score');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .order(sortBy, { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPlayers(data || []);
        setLoading(false);
      });
  }, [sortBy]);

  const myRank = players.findIndex(p => p.id === user?.id) + 1;

  const sortOptions: { key: SortBy; label: string; icon: React.ReactNode }[] = [
    { key: 'total_score', label: 'Punkte', icon: <Star size={14} /> },
    { key: 'games_won', label: 'Siege', icon: <Trophy size={14} /> },
    { key: 'best_streak', label: 'Beste Serie', icon: <TrendingUp size={14} /> },
    { key: 'games_played', label: 'Spiele', icon: <Target size={14} /> },
  ];

  const getValue = (player: Profile) => {
    switch (sortBy) {
      case 'total_score': return player.total_score.toLocaleString() + ' Pkt.';
      case 'games_won': return player.games_won + ' Siege';
      case 'best_streak': return player.best_streak + '🔥';
      case 'games_played': return player.games_played + ' Spiele';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Crown size={32} className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-black text-white">Bestenliste</h1>
          {myRank > 0 && (
            <p className="text-nexus-muted text-sm">Dein Rang: #{myRank}</p>
          )}
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-xl p-1 gap-1 mb-6">
        {sortOptions.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-sm font-bold transition-all duration-300 cursor-pointer ${
              sortBy === key
                ? 'bg-nexus-surface/90 text-white border border-[#2E5BFF]/30 shadow-[0_0_15px_rgba(46,91,255,0.1)]'
                : 'text-nexus-muted hover:text-white hover:bg-nexus-surface/80 border border-transparent'
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {players.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 0, 2].map(idx => {
            const player = players[idx];
            const rank = idx + 1;
            const podiumOrder = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            const heights = ['h-28', 'h-36', 'h-24'];
            const medals = ['🥇', '🥈', '🥉'];
            const colors = [
              'bg-yellow-500/10 border-yellow-500/30',
              'bg-slate-400/10 border-slate-400/30',
              'bg-amber-600/10 border-amber-600/30',
            ];

            return (
              <div
                key={player.id}
                className={`flex flex-col items-center justify-end p-4 rounded-lg border ${colors[podiumOrder]} ${heights[podiumOrder]} ${
                  player.id === user?.id ? 'ring-2 ring-nexus-primary' : ''
                }`}
              >
                <div className="text-2xl mb-1">{medals[podiumOrder]}</div>
                <Avatar username={player.username} size="sm" isOnline={player.is_online} />
                <p className="text-xs font-bold text-white mt-1 truncate max-w-full">{player.username}</p>
                <p className="text-xs text-nexus-muted">{getValue(player)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-nexus-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          players.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 px-5 py-4 border-b border-nexus-border last:border-0 transition-all duration-300 ${
                player.id === user?.id ? 'bg-nexus-primary/5' : 'hover:bg-nexus-surface/50'
              }`}
            >
              <span className={`text-sm font-black w-8 text-center flex-shrink-0 ${
                idx === 0 ? 'text-yellow-400 text-xl' :
                idx === 1 ? 'text-slate-300 text-lg' :
                idx === 2 ? 'text-amber-600 text-lg' :
                'text-slate-500'
              }`}>
                {idx < 3 ? ['👑', '🥈', '🥉'][idx] : `#${idx + 1}`}
              </span>

              <Avatar username={player.username} size="sm" isOnline={player.is_online} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white truncate">{player.username}</span>
                  {player.id === user?.id && <Badge variant="info" size="sm">Du</Badge>}
                  {player.is_admin && <Badge variant="warning" size="sm">Admin</Badge>}
                </div>
                <span className="text-xs text-nexus-muted">{player.games_played} Spiele gespielt</span>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="font-bold text-white">{getValue(player)}</div>
                <div className="text-xs text-nexus-muted">{player.games_won} Siege</div>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
