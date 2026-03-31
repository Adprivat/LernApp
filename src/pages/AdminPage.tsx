import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Trash2, Crown, Ban, Search, RefreshCw, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/lib/errorHandler';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import type { Profile } from '@/types';
import { useNavigate } from 'react-router-dom';

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalGames: 0,
  });

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/');
      return;
    }
    fetchUsers();
    fetchStats();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const [{ count: totalUsers }, { count: onlineUsers }, { count: totalGames }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('game_sessions').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        totalUsers: totalUsers || 0,
        onlineUsers: onlineUsers || 0,
        totalGames: totalGames || 0,
      });
    } catch (err: unknown) {
      console.error('fetchStats failed:', getErrorMessage(err));
    }
  };

  const toggleAdmin = async (profile: Profile) => {
    if (profile.id === user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !profile.is_admin })
      .eq('id', profile.id);
    if (error) {
      console.error('toggleAdmin failed:', error.message);
    }
    fetchUsers();
  };

  const deleteUser = async (profile: Profile) => {
    if (profile.id === user?.id) return;
    if (!confirm(`Benutzer "${profile.username}" wirklich löschen?`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (error) {
      console.error('deleteUser failed:', error.message);
    }
    fetchUsers();
  };

  const resetScore = async (profile: Profile) => {
    if (!confirm(`Punkte von "${profile.username}" wirklich zurücksetzen?`)) return;
    const { error } = await supabase
      .from('profiles')
      .update({ total_score: 0, games_played: 0, games_won: 0, current_streak: 0, best_streak: 0 })
      .eq('id', profile.id);
    if (error) {
      console.error('resetScore failed:', error.message);
    }
    fetchUsers();
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (!user?.is_admin) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={32} className="text-amber-400" />
        <div>
          <h1 className="text-3xl font-black text-white">Admin-Panel</h1>
          <p className="text-nexus-muted text-sm">Benutzer- und Systemverwaltung</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Benutzer gesamt', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Aktuell online', value: stats.onlineUsers, icon: BarChart3, color: 'text-emerald-400' },
          { label: 'Spiele gesamt', value: stats.totalGames, icon: ShieldCheck, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="text-center">
            <Icon size={24} className={`${color} mx-auto mb-2`} />
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-sm text-nexus-muted">{label}</div>
          </Card>
        ))}
      </div>

      {/* User management */}
      <Card padding="none">
        <div className="flex items-center justify-between p-5 border-b border-nexus-border">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Users size={18} />
            Benutzerverwaltung ({filtered.length})
          </h2>
          <div className="flex gap-3">
            <div className="w-64">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Benutzer suchen..."
                icon={<Search size={14} />}
              />
            </div>
            <Button size="sm" variant="ghost" onClick={fetchUsers}>
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nexus-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Benutzer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Punkte</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Spiele</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Registriert</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(profile => (
                    <tr key={profile.id} className="border-b border-nexus-border hover:bg-nexus-surface/30 transition-all duration-300">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar username={profile.username} size="sm" isOnline={profile.is_online} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{profile.username}</span>
                            {profile.id === user?.id && <Badge variant="info" size="sm">Du</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {profile.is_online ? (
                          <Badge variant="success" size="sm">Online</Badge>
                        ) : (
                          <Badge variant="default" size="sm">Offline</Badge>
                        )}
                        {profile.is_admin && (
                          <Badge variant="warning" size="sm">Admin</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-white font-semibold">{profile.total_score.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-nexus-text">{profile.games_played}</span>
                      <span className="text-nexus-muted text-xs ml-1">({profile.games_won}W)</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-nexus-muted text-sm">
                        {new Date(profile.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleAdmin(profile)}
                          disabled={profile.id === user?.id}
                          className={`p-2 rounded-xl transition-all duration-300 cursor-pointer ${
                            profile.is_admin
                              ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 shadow-[0_0_10px_rgba(255,179,0,0.1)]'
                              : 'text-nexus-muted hover:text-amber-400 hover:bg-amber-400/10'
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                          title={profile.is_admin ? 'Admin entfernen' : 'Zum Admin machen'}
                        >
                          <Crown size={14} />
                        </button>
                        <button
                          onClick={() => resetScore(profile)}
                          disabled={profile.id === user?.id}
                          className="p-2 rounded-xl text-nexus-muted hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Punkte zurücksetzen"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => deleteUser(profile)}
                          disabled={profile.id === user?.id}
                          className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 hover:shadow-[0_0_10px_rgba(255,61,0,0.1)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Benutzer löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
