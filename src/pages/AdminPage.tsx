import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Trash2, Crown, Search, RefreshCw, BarChart3, Pencil, X, Trophy, Zap, RotateCcw, Megaphone, Plus, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/lib/errorHandler';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Profile, Announcement } from '@/types';
import { useNavigate } from 'react-router-dom';

type ActiveTab = 'users' | 'lobbies' | 'challenges' | 'tournaments' | 'updates';

interface EditStatsForm {
  total_score: number;
  games_played: number;
  games_won: number;
  current_streak: number;
  best_streak: number;
}

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0, totalGames: 0 });

  // Edit stats modal
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<EditStatsForm>({ total_score: 0, games_played: 0, games_won: 0, current_streak: 0, best_streak: 0 });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Active sessions
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);
  const [annForm, setAnnForm] = useState({ title: '', content: '', category: 'info' as Announcement['category'] });
  const [annLoading, setAnnLoading] = useState(false);
  const [annError, setAnnError] = useState('');

  useEffect(() => {
    if (!user?.is_admin) { navigate('/'); return; }
    fetchUsers();
    fetchStats();
    fetchLobbies();
    fetchChallenges();
    fetchTournaments();
    fetchAnnouncements();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('total_score', { ascending: false });
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
      setStats({ totalUsers: totalUsers || 0, onlineUsers: onlineUsers || 0, totalGames: totalGames || 0 });
    } catch (err) {
      console.error('fetchStats failed:', getErrorMessage(err));
    }
  };

  const fetchLobbies = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('*, host:profiles!host_id(username), players:game_players(id)')
      .eq('mode', 'group')
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false });
    setLobbies(data || []);
  };

  const fetchChallenges = async () => {
    const { data } = await supabase
      .from('challenges')
      .select('*, challenger:profiles!challenger_id(username), challenged:profiles!challenged_id(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setChallenges(data || []);
  };

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*, participants:tournament_participants(id)')
      .in('status', ['registering', 'active'])
      .order('created_at', { ascending: false });
    setTournaments(data || []);
  };

  const toggleAdmin = async (profile: Profile) => {
    if (profile.id === user?.id) return;
    const { error } = await supabase.from('profiles').update({ is_admin: !profile.is_admin }).eq('id', profile.id);
    if (error) setError(getErrorMessage(error));
    else fetchUsers();
  };

  const resetScore = async (profile: Profile) => {
    if (profile.id === user?.id) return;
    if (!confirm(`Statistiken von "${profile.username}" wirklich zurücksetzen?`)) return;
    const { error } = await supabase.from('profiles').update({
      total_score: 0, games_played: 0, games_won: 0, current_streak: 0, best_streak: 0,
    }).eq('id', profile.id);
    if (error) setError(getErrorMessage(error));
    else fetchUsers();
  };

  const deleteUser = async (profile: Profile) => {
    if (profile.id === user?.id) return;
    if (!confirm(`Benutzer "${profile.username}" wirklich löschen?`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (error) setError(getErrorMessage(error));
    else fetchUsers();
  };

  const openEdit = (profile: Profile) => {
    setEditTarget(profile);
    setEditForm({
      total_score: profile.total_score,
      games_played: profile.games_played,
      games_won: profile.games_won,
      current_streak: profile.current_streak,
      best_streak: profile.best_streak,
    });
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    setEditError('');
    const { error } = await supabase.from('profiles').update({
      total_score: Number(editForm.total_score),
      games_played: Number(editForm.games_played),
      games_won: Number(editForm.games_won),
      current_streak: Number(editForm.current_streak),
      best_streak: Number(editForm.best_streak),
    }).eq('id', editTarget.id);
    setEditLoading(false);
    if (error) { setEditError(getErrorMessage(error)); return; }
    setEditTarget(null);
    fetchUsers();
  };

  const cancelLobby = async (id: string) => {
    const { error } = await supabase.from('game_sessions').update({ status: 'cancelled' }).eq('id', id);
    if (error) setError(getErrorMessage(error));
    else fetchLobbies();
  };

  const cancelChallenge = async (id: string) => {
    const { error } = await supabase.from('challenges').update({ status: 'cancelled' }).eq('id', id);
    if (error) setError(getErrorMessage(error));
    else fetchChallenges();
  };

  const cancelTournament = async (id: string) => {
    const { error } = await supabase.from('tournaments').update({ status: 'cancelled' }).eq('id', id);
    if (error) setError(getErrorMessage(error));
    else fetchTournaments();
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
  };

  const openCreateAnnouncement = () => {
    setEditAnnouncement(null);
    setAnnForm({ title: '', content: '', category: 'info' });
    setAnnError('');
    setAnnouncementModal(true);
  };

  const openEditAnnouncement = (ann: Announcement) => {
    setEditAnnouncement(ann);
    setAnnForm({ title: ann.title, content: ann.content, category: ann.category });
    setAnnError('');
    setAnnouncementModal(true);
  };

  const saveAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.content.trim()) {
      setAnnError('Titel und Inhalt sind erforderlich');
      return;
    }
    setAnnLoading(true);
    setAnnError('');
    if (editAnnouncement) {
      const { error } = await supabase.from('announcements').update({
        title: annForm.title.trim(),
        content: annForm.content.trim(),
        category: annForm.category,
        updated_at: new Date().toISOString(),
      }).eq('id', editAnnouncement.id);
      if (error) { setAnnError(getErrorMessage(error)); setAnnLoading(false); return; }
    } else {
      const { error } = await supabase.from('announcements').insert({
        title: annForm.title.trim(),
        content: annForm.content.trim(),
        category: annForm.category,
        created_by: user?.id,
        is_published: false,
      });
      if (error) { setAnnError(getErrorMessage(error)); setAnnLoading(false); return; }
    }
    setAnnLoading(false);
    setAnnouncementModal(false);
    fetchAnnouncements();
  };

  const togglePublish = async (ann: Announcement) => {
    const { error } = await supabase.from('announcements').update({
      is_published: !ann.is_published,
      updated_at: new Date().toISOString(),
    }).eq('id', ann.id);
    if (error) setError(getErrorMessage(error));
    else fetchAnnouncements();
  };

  const deleteAnnouncement = async (ann: Announcement) => {
    if (!confirm(`Update "${ann.title}" wirklich löschen?`)) return;
    const { error } = await supabase.from('announcements').delete().eq('id', ann.id);
    if (error) setError(getErrorMessage(error));
    else fetchAnnouncements();
  };

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  if (!user?.is_admin) return null;

  const tabs: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'users', label: 'Benutzer', count: users.length },
    { id: 'lobbies', label: 'Lobbys', count: lobbies.length },
    { id: 'challenges', label: 'Herausforderungen', count: challenges.length },
    { id: 'tournaments', label: 'Turniere', count: tournaments.length },
    { id: 'updates', label: 'Updates', count: announcements.length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck size={32} className="text-amber-400" />
        <div>
          <h1 className="text-3xl font-black text-white">Admin-Panel</h1>
          <p className="text-nexus-muted text-sm">Benutzer- und Systemverwaltung</p>
        </div>
      </div>

      {error && (
        <div className="bg-nexus-danger/10 border border-nexus-danger/30 rounded-lg px-4 py-3 text-sm text-nexus-danger mb-6 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="ml-3 hover:text-white cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-nexus-bg/60 border border-nexus-border rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-nexus-surface text-white border border-nexus-border'
                : 'text-nexus-muted hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-amber-400/20 text-amber-400' : 'bg-nexus-surface text-nexus-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === 'users' && (
        <Card padding="none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-nexus-border">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users size={18} /> Benutzerverwaltung ({filtered.length})
            </h2>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:w-64 sm:flex-none">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Benutzer suchen..." icon={<Search size={14} />} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => { fetchUsers(); fetchStats(); }}>
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
                    <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Serie</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(profile => (
                    <tr key={profile.id} className="border-b border-nexus-border hover:bg-nexus-surface/30 transition-all duration-300">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar username={profile.username} size="sm" isOnline={profile.is_online} avatarUrl={profile.avatar_url} />
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
                          {profile.is_online ? <Badge variant="success" size="sm">Online</Badge> : <Badge variant="default" size="sm">Offline</Badge>}
                          {profile.is_admin && <Badge variant="warning" size="sm">Admin</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-white">{profile.total_score.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-nexus-text">{profile.games_played}</span>
                        <span className="text-nexus-muted text-xs ml-1">({profile.games_won}W)</span>
                      </td>
                      <td className="px-5 py-4 text-right text-nexus-muted text-sm">
                        🔥{profile.current_streak} / ⭐{profile.best_streak}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(profile)}
                            className="p-2 rounded-xl text-nexus-muted hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 cursor-pointer"
                            title="Statistiken bearbeiten"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => resetScore(profile)}
                            disabled={profile.id === user?.id}
                            className="p-2 rounded-xl text-nexus-muted hover:text-orange-400 hover:bg-orange-400/10 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Statistiken zurücksetzen"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            onClick={() => toggleAdmin(profile)}
                            disabled={profile.id === user?.id}
                            className={`p-2 rounded-xl transition-all duration-300 cursor-pointer ${
                              profile.is_admin
                                ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                                : 'text-nexus-muted hover:text-amber-400 hover:bg-amber-400/10'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={profile.is_admin ? 'Admin entfernen' : 'Zum Admin machen'}
                          >
                            <Crown size={14} />
                          </button>
                          <button
                            onClick={() => deleteUser(profile)}
                            disabled={profile.id === user?.id}
                            className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
      )}

      {/* Lobbies tab */}
      {activeTab === 'lobbies' && (
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-nexus-border">
            <h2 className="font-bold text-white flex items-center gap-2"><Users size={18} /> Aktive Lobbys</h2>
            <Button size="sm" variant="ghost" onClick={fetchLobbies}><RefreshCw size={14} /></Button>
          </div>
          {lobbies.length === 0 ? (
            <p className="text-nexus-muted text-sm text-center py-10">Keine aktiven Lobbys</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-nexus-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Host</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Kategorie</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Spieler</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {lobbies.map(l => (
                  <tr key={l.id} className="border-b border-nexus-border hover:bg-nexus-surface/30">
                    <td className="px-5 py-3 text-white font-medium">{l.host?.username || '—'}</td>
                    <td className="px-5 py-3 text-nexus-muted">{l.category} · {l.question_count} Fragen</td>
                    <td className="px-5 py-3 text-nexus-muted">{l.players?.length || 0} / {l.max_players || 4}</td>
                    <td className="px-5 py-3">
                      <Badge variant={l.status === 'active' ? 'success' : 'info'} size="sm">{l.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => cancelLobby(l.id)}
                        className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 transition-all duration-300 cursor-pointer"
                        title="Lobby abbrechen"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Challenges tab */}
      {activeTab === 'challenges' && (
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-nexus-border">
            <h2 className="font-bold text-white flex items-center gap-2"><Zap size={18} className="text-amber-400" /> Offene Herausforderungen</h2>
            <Button size="sm" variant="ghost" onClick={fetchChallenges}><RefreshCw size={14} /></Button>
          </div>
          {challenges.length === 0 ? (
            <p className="text-nexus-muted text-sm text-center py-10">Keine offenen Herausforderungen</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-nexus-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Herausforderer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Gegner</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Kategorie</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Typ</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map(c => (
                  <tr key={c.id} className="border-b border-nexus-border hover:bg-nexus-surface/30">
                    <td className="px-5 py-3 text-white font-medium">{c.challenger?.username || '—'}</td>
                    <td className="px-5 py-3 text-nexus-muted">{c.challenged?.username || <span className="italic">Offen</span>}</td>
                    <td className="px-5 py-3 text-nexus-muted">{c.category} · {c.question_count} Fragen</td>
                    <td className="px-5 py-3">
                      <Badge variant={c.is_open ? 'info' : 'warning'} size="sm">{c.is_open ? 'Offen' : 'Gezielt'}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => cancelChallenge(c.id)}
                        className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 transition-all duration-300 cursor-pointer"
                        title="Herausforderung abbrechen"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Tournaments tab */}
      {activeTab === 'tournaments' && (
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-nexus-border">
            <h2 className="font-bold text-white flex items-center gap-2"><Trophy size={18} className="text-yellow-400" /> Aktive Turniere</h2>
            <Button size="sm" variant="ghost" onClick={fetchTournaments}><RefreshCw size={14} /></Button>
          </div>
          {tournaments.length === 0 ? (
            <p className="text-nexus-muted text-sm text-center py-10">Keine aktiven Turniere</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-nexus-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Kategorie</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Teilnehmer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-nexus-muted uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map(t => (
                  <tr key={t.id} className="border-b border-nexus-border hover:bg-nexus-surface/30">
                    <td className="px-5 py-3 text-white font-medium">{t.name}</td>
                    <td className="px-5 py-3 text-nexus-muted">{t.category} · {t.question_count} Fragen</td>
                    <td className="px-5 py-3 text-nexus-muted">{t.participants?.length || 0} / {t.max_players}</td>
                    <td className="px-5 py-3">
                      <Badge variant={t.status === 'active' ? 'success' : 'info'} size="sm">
                        {t.status === 'registering' ? 'Anmeldung' : 'Läuft'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => cancelTournament(t.id)}
                        className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 transition-all duration-300 cursor-pointer"
                        title="Turnier abbrechen"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Updates tab */}
      {activeTab === 'updates' && (
        <Card padding="none">
          <div className="flex items-center justify-between p-5 border-b border-nexus-border">
            <h2 className="font-bold text-white flex items-center gap-2"><Megaphone size={18} className="text-blue-400" /> Update Board</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={fetchAnnouncements}><RefreshCw size={14} /></Button>
              <Button size="sm" variant="primary" onClick={openCreateAnnouncement}><Plus size={14} /> Neues Update</Button>
            </div>
          </div>
          {announcements.length === 0 ? (
            <div className="text-center py-16 text-nexus-muted">
              <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-white mb-1">Keine Updates</p>
              <p className="text-sm">Erstelle dein erstes Update für die Nutzer</p>
            </div>
          ) : (
            <div className="divide-y divide-nexus-border">
              {announcements.map(ann => {
                const catStyles: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'danger' }> = {
                  feature: { label: 'Feature', variant: 'success' },
                  bugfix: { label: 'Bugfix', variant: 'danger' },
                  wartung: { label: 'Wartung', variant: 'warning' },
                  info: { label: 'Info', variant: 'info' },
                };
                const cat = catStyles[ann.category] || catStyles.info;
                return (
                  <div key={ann.id} className="px-5 py-4 hover:bg-nexus-surface/30 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{ann.title}</span>
                          <Badge variant={cat.variant} size="sm">{cat.label}</Badge>
                          {ann.is_published
                            ? <Badge variant="success" size="sm">Veröffentlicht</Badge>
                            : <Badge variant="default" size="sm">Entwurf</Badge>
                          }
                        </div>
                        <p className="text-sm text-nexus-muted line-clamp-2">{ann.content}</p>
                        <p className="text-xs text-nexus-muted mt-1">{new Date(ann.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => togglePublish(ann)}
                          className={`p-2 rounded-xl transition-all duration-300 cursor-pointer ${ann.is_published ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20' : 'text-nexus-muted hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                          title={ann.is_published ? 'Zurückziehen' : 'Veröffentlichen'}
                        >
                          {ann.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={() => openEditAnnouncement(ann)}
                          className="p-2 rounded-xl text-nexus-muted hover:text-blue-400 hover:bg-blue-400/10 transition-all duration-300 cursor-pointer"
                          title="Bearbeiten"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteAnnouncement(ann)}
                          className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 transition-all duration-300 cursor-pointer"
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Announcement modal */}
      <Modal isOpen={announcementModal} onClose={() => setAnnouncementModal(false)} title={editAnnouncement ? 'Update bearbeiten' : 'Neues Update'}>
        <div className="flex flex-col gap-4">
          <Input
            label="Titel"
            value={annForm.title}
            onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))}
            placeholder="z.B. Neue Funktion: Gruppenspiel"
          />
          <div>
            <label className="text-xs font-medium text-nexus-muted block mb-1">Inhalt</label>
            <textarea
              value={annForm.content}
              onChange={e => setAnnForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Beschreibe das Update..."
              rows={4}
              className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-nexus-accent resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-nexus-muted block mb-2">Kategorie</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { key: 'feature', label: '✨ Feature', active: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' },
                { key: 'bugfix', label: '🐛 Bugfix', active: 'bg-red-500/20 border-red-500/40 text-red-400' },
                { key: 'wartung', label: '🔧 Wartung', active: 'bg-amber-500/20 border-amber-500/40 text-amber-400' },
                { key: 'info', label: 'ℹ️ Info', active: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
              ] as const).map(({ key, label, active }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAnnForm(f => ({ ...f, category: key }))}
                  className={`py-2 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer border ${
                    annForm.category === key
                      ? active
                      : 'border-nexus-border text-nexus-muted hover:text-white hover:bg-nexus-surface/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {annError && <p className="text-sm text-nexus-danger">{annError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setAnnouncementModal(false)}>Abbrechen</Button>
            <Button variant="primary" fullWidth loading={annLoading} onClick={saveAnnouncement}>
              {editAnnouncement ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit stats modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Statistiken: ${editTarget?.username}`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'total_score', label: 'Gesamtpunkte' },
              { key: 'games_played', label: 'Spiele gespielt' },
              { key: 'games_won', label: 'Siege' },
              { key: 'current_streak', label: 'Aktuelle Serie' },
              { key: 'best_streak', label: 'Beste Serie' },
            ] as { key: keyof EditStatsForm; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-medium text-nexus-muted block mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={editForm[key]}
                  onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-nexus-accent"
                />
              </div>
            ))}
          </div>
          {editError && <p className="text-sm text-nexus-danger">{editError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setEditTarget(null)}>Abbrechen</Button>
            <Button variant="primary" fullWidth loading={editLoading} onClick={saveEdit}>Speichern</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
