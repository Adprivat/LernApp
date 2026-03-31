import React, { useEffect, useState } from 'react';
import { Crown, Star, Target, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Profile } from '@/types';

type SortBy = 'total_score' | 'games_won' | 'best_streak' | 'games_played';
type Tab = 'global' | 'tournament';

interface TournamentEntry {
  user_id: string;
  username: string;
  is_online: boolean;
  avatar_url?: string;
  total_score: number;
  games: number;
}

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('global');
  const [players, setPlayers] = useState<Profile[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('total_score');
  const [loading, setLoading] = useState(false);
  const [tournamentEntries, setTournamentEntries] = useState<TournamentEntry[]>([]);
  const [tournamentLoading, setTournamentLoading] = useState(false);

  useEffect(() => {
    if (tab === 'global') {
      setLoading(true);
      supabase
        .from('profiles')
        .select('*')
        .order(sortBy, { ascending: false })
        .limit(50)
        .then(({ data }) => { setPlayers(data || []); setLoading(false); });
    }
  }, [sortBy, tab]);

  useEffect(() => {
    if (tab !== 'tournament') return;
    setTournamentLoading(true);
    (async () => {
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('mode', 'tournament')
        .eq('status', 'finished');

      if (!sessions || sessions.length === 0) {
        setTournamentEntries([]);
        setTournamentLoading(false);
        return;
      }

      const ids = sessions.map(s => s.id);
      const { data: gamePlayers } = await supabase
        .from('game_players')
        .select('user_id, score, profile:profiles(id,username,is_online,avatar_url)')
        .in('session_id', ids);

      if (!gamePlayers) { setTournamentEntries([]); setTournamentLoading(false); return; }

      // Aggregate by user_id
      const map = new Map<string, TournamentEntry>();
      for (const p of gamePlayers) {
        const prof = (p as any).profile;
        if (!prof) continue;
        if (!map.has(p.user_id)) {
          map.set(p.user_id, { user_id: p.user_id, username: prof.username, is_online: prof.is_online, avatar_url: prof.avatar_url, total_score: 0, games: 0 });
        }
        const entry = map.get(p.user_id)!;
        entry.total_score += p.score;
        entry.games += 1;
      }

      const sorted = Array.from(map.values()).sort((a, b) => b.total_score - a.total_score);
      setTournamentEntries(sorted);
      setTournamentLoading(false);
    })();
  }, [tab]);

  const myRank = players.findIndex(p => p.id === user?.id) + 1;
  const myTournamentRank = tournamentEntries.findIndex(e => e.user_id === user?.id) + 1;

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

  const medals = ['👑', '🥈', '🥉'];
  const podiumColors = [
    'bg-yellow-500/10 border-yellow-500/30',
    'bg-slate-400/10 border-slate-400/30',
    'bg-amber-600/10 border-amber-600/30',
  ];
  const podiumHeights = ['h-28', 'h-36', 'h-24'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Crown size={32} className="text-yellow-400" />
        <div>
          <h1 className="text-3xl font-black text-white">Bestenliste</h1>
          {tab === 'global' && myRank > 0 && <p className="text-nexus-muted text-sm">Dein Rang: #{myRank}</p>}
          {tab === 'tournament' && myTournamentRank > 0 && <p className="text-nexus-muted text-sm">Dein Turnier-Rang: #{myTournamentRank}</p>}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-nexus-surface/70 border border-nexus-border rounded-xl mb-6">
        {([
          { id: 'global' as Tab, label: 'Global', icon: <Star size={14} /> },
          { id: 'tournament' as Tab, label: 'Turnier', icon: <Trophy size={14} /> },
        ]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-sm font-bold transition-all duration-300 cursor-pointer ${
              tab === id
                ? 'bg-nexus-surface/90 text-white border border-[#2E5BFF]/30 shadow-[0_0_15px_rgba(46,91,255,0.1)]'
                : 'text-nexus-muted hover:text-white hover:bg-nexus-surface/80 border border-transparent'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Global tab */}
      {tab === 'global' && (
        <>
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

          {players.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 0, 2].map(idx => {
                const player = players[idx];
                const podiumOrder = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                return (
                  <div key={player.id} className={`flex flex-col items-center justify-end p-4 rounded-lg border ${podiumColors[podiumOrder]} ${podiumHeights[podiumOrder]} ${player.id === user?.id ? 'ring-2 ring-nexus-primary' : ''}`}>
                    <div className="text-2xl mb-1">{medals[podiumOrder]}</div>
                    <Avatar username={player.username} size="sm" isOnline={player.is_online} avatarUrl={player.avatar_url} />
                    <p className="text-xs font-bold text-white mt-1 truncate max-w-full">{player.username}</p>
                    <p className="text-xs text-nexus-muted">{getValue(player)}</p>
                  </div>
                );
              })}
            </div>
          )}

          <Card padding="none">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-nexus-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              players.map((player, idx) => (
                <div key={player.id} className={`flex items-center gap-4 px-5 py-4 border-b border-nexus-border last:border-0 transition-all duration-300 ${player.id === user?.id ? 'bg-nexus-primary/5' : 'hover:bg-nexus-surface/50'}`}>
                  <span className={`text-sm font-black w-8 text-center flex-shrink-0 ${idx === 0 ? 'text-yellow-400 text-xl' : idx === 1 ? 'text-slate-300 text-lg' : idx === 2 ? 'text-amber-600 text-lg' : 'text-slate-500'}`}>
                    {idx < 3 ? medals[idx] : `#${idx + 1}`}
                  </span>
                  <Avatar username={player.username} size="sm" isOnline={player.is_online} avatarUrl={player.avatar_url} />
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
        </>
      )}

      {/* Tournament tab */}
      {tab === 'tournament' && (
        <>
          {tournamentEntries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 0, 2].map(idx => {
                const entry = tournamentEntries[idx];
                const podiumOrder = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                return (
                  <div key={entry.user_id} className={`flex flex-col items-center justify-end p-4 rounded-lg border ${podiumColors[podiumOrder]} ${podiumHeights[podiumOrder]} ${entry.user_id === user?.id ? 'ring-2 ring-nexus-primary' : ''}`}>
                    <div className="text-2xl mb-1">{medals[podiumOrder]}</div>
                    <Avatar username={entry.username} size="sm" isOnline={entry.is_online} avatarUrl={entry.avatar_url} />
                    <p className="text-xs font-bold text-white mt-1 truncate max-w-full">{entry.username}</p>
                    <p className="text-xs text-nexus-muted">{entry.total_score.toLocaleString()} Pkt.</p>
                  </div>
                );
              })}
            </div>
          )}

          <Card padding="none">
            {tournamentLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tournamentEntries.length === 0 ? (
              <div className="text-center py-16 text-nexus-muted">
                <Trophy size={40} className="mx-auto mb-3 opacity-30 text-yellow-400" />
                <p className="font-semibold text-white mb-1">Noch keine Turnierdaten</p>
                <p className="text-sm">Schließe ein Turnier ab um hier zu erscheinen</p>
              </div>
            ) : (
              tournamentEntries.map((entry, idx) => (
                <div key={entry.user_id} className={`flex items-center gap-4 px-5 py-4 border-b border-nexus-border last:border-0 transition-all duration-300 ${entry.user_id === user?.id ? 'bg-nexus-primary/5' : 'hover:bg-nexus-surface/50'}`}>
                  <span className={`text-sm font-black w-8 text-center flex-shrink-0 ${idx === 0 ? 'text-yellow-400 text-xl' : idx === 1 ? 'text-slate-300 text-lg' : idx === 2 ? 'text-amber-600 text-lg' : 'text-slate-500'}`}>
                    {idx < 3 ? medals[idx] : `#${idx + 1}`}
                  </span>
                  <Avatar username={entry.username} size="sm" isOnline={entry.is_online} avatarUrl={entry.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{entry.username}</span>
                      {entry.user_id === user?.id && <Badge variant="info" size="sm">Du</Badge>}
                    </div>
                    <span className="text-xs text-nexus-muted">{entry.games} Turnier{entry.games !== 1 ? 'e' : ''}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-yellow-400">{entry.total_score.toLocaleString()} Pkt.</div>
                    <div className="text-xs text-nexus-muted">Gesamt</div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
