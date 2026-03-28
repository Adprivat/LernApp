import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Trophy, Zap, Star, Target, TrendingUp, Crown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Profile } from '@/types';

const modes = [
  {
    path: '/learn',
    icon: BookOpen,
    emoji: '📚',
    title: 'Selbst lernen',
    desc: 'Übe in deinem eigenen Tempo',
    color: 'from-indigo-600 to-indigo-800',
    border: 'border-indigo-500/30',
  },
  {
    path: '/challenge',
    icon: Zap,
    emoji: '⚔️',
    title: 'Herausforderung',
    desc: '1v1 – fordere jeden heraus',
    color: 'from-amber-600 to-amber-800',
    border: 'border-amber-500/30',
  },
  {
    path: '/groups',
    icon: Users,
    emoji: '👥',
    title: 'Gruppen',
    desc: '2-4 Spieler im Team',
    color: 'from-emerald-600 to-emerald-800',
    border: 'border-emerald-500/30',
  },
  {
    path: '/tournament',
    icon: Trophy,
    emoji: '🏆',
    title: 'Turnier',
    desc: 'Kämpfe um den Titel',
    color: 'from-purple-600 to-purple-800',
    border: 'border-purple-500/30',
  },
];

export function HomePage() {
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(5)
      .then(({ data }) => setLeaderboard(data || []));

    supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('is_online', true)
      .then(({ count }) => setOnlinePlayers(count || 0));
  }, []);

  if (!user) return null;

  const accuracy = user.games_played > 0
    ? Math.round((user.games_won / user.games_played) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          Willkommen, <span className="text-indigo-400">{user.username}</span>! 👋
        </h1>
        <p className="text-slate-400 mt-1">
          {onlinePlayers > 0 && (
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {onlinePlayers} Spieler online
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* My stats */}
          <Card>
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Star size={18} className="text-yellow-400" />
              Meine Statistiken
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Punkte', value: user.total_score.toLocaleString(), icon: Star, color: 'text-yellow-400' },
                { label: 'Spiele', value: user.games_played, icon: Target, color: 'text-blue-400' },
                { label: 'Siege', value: user.games_won, icon: Trophy, color: 'text-emerald-400' },
                { label: 'Streak', value: `${user.current_streak}🔥`, icon: TrendingUp, color: 'text-orange-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-slate-700/40 rounded-xl p-3 text-center">
                  <Icon size={16} className={`${color} mx-auto mb-1`} />
                  <div className="text-xl font-black text-white">{value}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Game modes */}
          <div>
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-400" />
              Spielmodi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modes.map(({ path, emoji, title, desc, color, border }) => (
                <Link key={path} to={path}>
                  <div className={`bg-gradient-to-br ${color} border ${border} rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 cursor-pointer`}>
                    <div className="text-4xl mb-3">{emoji}</div>
                    <h3 className="font-bold text-white text-lg">{title}</h3>
                    <p className="text-white/60 text-sm mt-1">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Leaderboard */}
          <Card>
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Crown size={18} className="text-yellow-400" />
              Bestenliste
            </h2>
            <div className="flex flex-col gap-2">
              {leaderboard.map((player, idx) => (
                <div key={player.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${
                  player.id === user.id ? 'bg-indigo-600/10 border border-indigo-500/30' : ''
                }`}>
                  <span className={`text-sm font-black w-5 text-center ${
                    idx === 0 ? 'text-yellow-400' :
                    idx === 1 ? 'text-slate-300' :
                    idx === 2 ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>
                    {idx === 0 ? '👑' : idx + 1}
                  </span>
                  <Avatar username={player.username} size="sm" isOnline={player.is_online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {player.username}
                      {player.id === user.id && <span className="text-xs text-indigo-400 ml-1">(Du)</span>}
                    </p>
                    <p className="text-xs text-slate-400">{player.total_score.toLocaleString()} Pkt.</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/leaderboard" className="block mt-3 text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Vollständige Bestenliste →
            </Link>
          </Card>

          {/* Quick play */}
          <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
            <h2 className="font-bold text-white mb-2">Schnellspiel</h2>
            <p className="text-slate-400 text-sm mb-4">Starte sofort mit 10 Fragen aus Allgemeinwissen</p>
            <Link to="/learn?category=general&count=10">
              <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-colors">
                Jetzt spielen ▶
              </button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
