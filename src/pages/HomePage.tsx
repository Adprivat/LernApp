import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Trophy, Zap, Star, Target, TrendingUp, Crown, AlertTriangle, Megaphone } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Profile, Announcement } from '@/types';

const modes = [
  {
    path: '/learn',
    icon: BookOpen,
    emoji: '📚',
    title: 'Selbst lernen',
    desc: 'Übe in deinem eigenen Tempo',
    accent: '#2E5BFF',
    iconColor: 'text-[#5A88FF]',
  },
  {
    path: '/challenge',
    icon: Zap,
    emoji: '⚔️',
    title: 'Herausforderung',
    desc: '1v1 – fordere jeden heraus',
    accent: '#FF6B35',
    iconColor: 'text-[#FF8F60]',
  },
  {
    path: '/groups',
    icon: Users,
    emoji: '👥',
    title: 'Gruppen',
    desc: '2-4 Spieler im Team',
    accent: '#00C853',
    iconColor: 'text-[#00E676]',
  },
  {
    path: '/tournament',
    icon: Trophy,
    emoji: '🏆',
    title: 'Turnier',
    desc: 'Kämpfe um den Titel',
    accent: '#B24BFF',
    iconColor: 'text-[#C97AFF]',
  },
];

export function HomePage() {
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('hide_from_leaderboard', false)
      .order('total_score', { ascending: false })
      .limit(5)
      .then(({ data }) => setLeaderboard(data || []));

    supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('is_online', true)
      .then(({ count }) => setOnlinePlayers(count || 0));

    supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setAnnouncements(data || []));
  }, []);

  if (!user) return null;

  const accuracy = user.games_played > 0
    ? Math.round((user.games_won / user.games_played) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Beta Warning */}
      <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 backdrop-blur-sm">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold text-amber-400">Beta-Version</span>
          <p className="text-amber-200/70 mt-0.5">Diese App befindet sich in aktiver Entwicklung. Funktionen können sich ändern und es können Fehler auftreten.</p>
        </div>
      </div>

      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Willkommen, <span className="text-nexus-accent">{user.username}</span>! 👋
        </h1>
        <p className="text-nexus-muted mt-1">
          {onlinePlayers > 0 && (
            <span className="inline-flex items-center gap-1.5 text-nexus-success">
              <span className="w-2 h-2 bg-nexus-success rounded-full animate-pulse" />
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
                <div key={label} className="bg-nexus-bg/60 border border-nexus-border rounded-lg p-3 text-center">
                  <Icon size={16} className={`${color} mx-auto mb-1`} />
                  <div className="text-xl font-black text-white">{value}</div>
                  <div className="text-xs text-nexus-muted">{label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Game modes */}
          <div>
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-nexus-accent" />
              Spielmodi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {modes.map(({ path, emoji, title, desc, accent, icon: Icon, iconColor }) => (
                <Link key={path} to={path}>
                  <div
                    className="relative overflow-hidden bg-nexus-surface/70 border border-nexus-border rounded-xl p-6 hover:scale-[1.03] transition-all duration-300 cursor-pointer group hover:border-opacity-40 backdrop-blur-sm"
                    style={{
                      boxShadow: `0 0 0 0 ${accent}00`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${accent}20, 0 0 60px ${accent}10`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${accent}00`;
                      (e.currentTarget as HTMLElement).style.borderColor = '';
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                    />
                    {/* Background radial glow */}
                    <div
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl"
                      style={{ background: accent }}
                    />

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 bg-nexus-surface/80 backdrop-blur-sm overflow-hidden"
                          style={{ border: `1px solid ${accent}30`, boxShadow: `0 0 12px ${accent}15` }}
                        >
                          {/* Icon top accent line */}
                          <div className="absolute top-0 left-0 right-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
                          {/* Icon corner glow */}
                          <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full opacity-[0.15] blur-xl" style={{ background: accent }} />
                          <Icon size={20} className={`${iconColor} relative z-10`} style={{ filter: `drop-shadow(0 0 4px ${accent}40)` }} />
                        </div>
                        <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{emoji}</span>
                      </div>
                      <h3 className="font-bold text-white text-lg">{title}</h3>
                      <p className="text-nexus-muted text-sm mt-1 group-hover:text-nexus-text/70 transition-colors duration-300">{desc}</p>
                    </div>
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
                <div key={player.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  player.id === user.id ? 'bg-nexus-primary/10 border border-nexus-primary/30' : ''
                }`}>
                  <span className={`text-sm font-black w-5 text-center ${
                    idx === 0 ? 'text-yellow-400' :
                    idx === 1 ? 'text-slate-300' :
                    idx === 2 ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>
                    {idx === 0 ? '👑' : idx + 1}
                  </span>
                  <Avatar username={player.username} size="sm" isOnline={player.is_online} avatarUrl={player.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {player.username}
                      {player.id === user.id && <span className="text-xs text-nexus-accent ml-1">(Du)</span>}
                    </p>
                    <p className="text-xs text-nexus-muted">{player.total_score.toLocaleString()} Pkt.</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/leaderboard" className="block mt-3 text-center text-sm text-nexus-accent hover:text-white transition-all duration-300">
              Vollständige Bestenliste →
            </Link>
          </Card>

          {/* Announcements */}
          {announcements.length > 0 && (
            <Card>
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <Megaphone size={18} className="text-blue-400" />
                Updates
              </h2>
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                {announcements.map(ann => {
                  const catStyles: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'danger' }> = {
                    feature: { label: 'Feature', variant: 'success' },
                    bugfix: { label: 'Bugfix', variant: 'danger' },
                    wartung: { label: 'Wartung', variant: 'warning' },
                    info: { label: 'Info', variant: 'info' },
                  };
                  const cat = catStyles[ann.category] || catStyles.info;
                  return (
                    <div key={ann.id} className="p-3 bg-nexus-bg/60 rounded-lg border border-nexus-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{ann.title}</span>
                        <Badge variant={cat.variant} size="sm">{cat.label}</Badge>
                      </div>
                      <p className="text-xs text-nexus-muted">{ann.content}</p>
                      <p className="text-xs text-nexus-muted/50 mt-1">{new Date(ann.created_at).toLocaleDateString('de-DE')}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
