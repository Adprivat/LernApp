import React, { useEffect, useState } from 'react';
import { Users, Plus, Play, Copy, Check, Crown, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/lib/errorHandler';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { CategorySelector } from '@/components/game/CategorySelector';
import { Modal } from '@/components/ui/Modal';
import type { GameSession, GamePlayer } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';

export function GroupPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState<(GameSession & { players: GamePlayer[] })[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [category, setCategory] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [teamSize, setTeamSize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchLobbies = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('*, players:game_players(*, profile:profiles(username, is_online, avatar_url))')
      .eq('mode', 'group')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(20);
    setLobbies(data || []);
  };

  useEffect(() => {
    fetchLobbies();
    const channel = supabase
      .channel('group_lobbies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, fetchLobbies)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const createLobby = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    if (!category) {
      setError('Bitte wähle eine Kategorie aus');
      setLoading(false);
      return;
    }
    try {
      const { data: session, error: createError } = await supabase
        .from('game_sessions')
        .insert({
          mode: 'group',
          status: 'waiting',
          category,
          question_count: questionCount,
          time_per_question: 20,
          current_question_index: 0,
          host_id: user.id,
          max_players: teamSize * 2,
          question_seed: Math.floor(Math.random() * 2147483647),
        })
        .select()
        .single();

      if (createError || !session) throw new Error(getErrorMessage(createError) || 'Fehler beim Erstellen');

      await supabase.from('game_players').insert({
        session_id: session.id,
        user_id: user.id,
        team: 1,
        score: 0,
        correct_answers: 0,
        wrong_answers: 0,
        is_ready: false,
        is_finished: false,
      });

      setShowCreate(false);
      navigate(`/lobby/${session.id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const joinLobby = async (sessionId: string) => {
    navigate(`/lobby/${sessionId}`);
  };

  const copyCode = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleJoinByCode = () => {
    if (joinCode.trim()) navigate(`/lobby/${joinCode.trim()}`);
  };

  const cancelLobby = async (sessionId: string) => {
    setError('');
    const { error } = await supabase
      .from('game_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);
    if (error) { setError(getErrorMessage(error)); return; }
    fetchLobbies();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Users className="text-emerald-400 flex-shrink-0" size={28} />
            Gruppenspiele
          </h1>
          <p className="text-nexus-muted mt-1">2 bis 4 Teams gegeneinander</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="group relative overflow-hidden inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm text-white cursor-pointer transition-all duration-300 active:scale-[0.97] bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border hover:border-[#00C853]/40 hover:shadow-[0_0_20px_rgba(0,200,83,0.12)] hover:scale-[1.02]"
        >
          <span className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#00C853,transparent)]" />
          <span className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#00C853] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl" />
          <span className="relative z-10 inline-flex items-center gap-2"><Plus size={18} /> Lobby erstellen</span>
        </button>
      </div>

      {/* Join by code */}
      <Card className="mb-6">
        <h2 className="font-bold text-white mb-3">Lobby beitreten</h2>
        <div className="flex gap-3">
          <Input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="Lobby-Code eingeben..."
            fullWidth
            onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
          />
          <Button onClick={handleJoinByCode} variant="secondary">
            Beitreten
          </Button>
        </div>
      </Card>

      {error && (
        <div className="bg-nexus-danger/10 border border-nexus-danger/30 rounded-lg px-4 py-3 text-sm text-nexus-danger mb-6">
          {error}
        </div>
      )}

      {/* Lobby list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Users size={16} className="text-nexus-muted" />
            Offene Lobbys
          </h2>
          <button onClick={fetchLobbies} className="p-1.5 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-surface/60 transition-all duration-300 cursor-pointer">
            <RefreshCw size={16} />
          </button>
        </div>

        {lobbies.length === 0 ? (
          <Card className="text-center py-12 text-nexus-muted">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>Keine offenen Lobbys</p>
            <p className="text-sm mt-1">Erstelle eine neue Lobby!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lobbies.map(lobby => {
              const players = lobby.players || [];
              const maxPlayers = (lobby as any).max_players || 4;
              const isFull = players.length >= maxPlayers;
              const isHost = lobby.host_id === user?.id;

              return (
                <Card key={lobby.id} padding="sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {players.find((p: any) => p.user_id === lobby.host_id)?.profile?.username || 'Lobby'}
                        </span>
                        {isHost && <Crown size={12} className="text-yellow-400" />}
                      </div>
                      <p className="text-xs text-nexus-muted">{lobby.category} · {lobby.question_count} Fragen</p>
                    </div>
                    <Badge variant={isFull ? 'danger' : 'success'} size="sm">
                      {players.length}/{maxPlayers}
                    </Badge>
                  </div>

                  {/* Players */}
                  <div className="flex -space-x-2 mb-3">
                    {players.slice(0, 6).map((p: any) => (
                      <Avatar key={p.id} username={p.profile?.username || '?'} size="sm" className="ring-2 ring-nexus-bg" avatarUrl={p.profile?.avatar_url} />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyCode(lobby.id)}
                    >
                      {copied === lobby.id ? <Check size={14} /> : <Copy size={14} />}
                      Code
                    </Button>
                    <Button
                      size="sm"
                      variant={isFull ? 'secondary' : 'primary'}
                      fullWidth
                      disabled={isFull && !isHost}
                      onClick={() => joinLobby(lobby.id)}
                    >
                      <Play size={14} />
                      {isHost ? 'Zur Lobby' : isFull ? 'Voll' : 'Beitreten'}
                    </Button>
                    {isHost && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => cancelLobby(lobby.id)}
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create lobby modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Lobby erstellen">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-nexus-muted block mb-2">Spielergröße</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ size: 2, label: '2v2', desc: '4 Spieler' }, { size: 3, label: '3v3', desc: '6 Spieler' }, { size: 4, label: '4v4', desc: '8 Spieler' }].map(({ size, label, desc }) => (
                <button
                  key={size}
                  onClick={() => setTeamSize(size)}
                  className={`relative overflow-hidden py-3 rounded-xl transition-all duration-300 cursor-pointer group backdrop-blur-sm ${
                    teamSize === size
                      ? 'bg-nexus-surface/90 text-white border border-[#00C853]/40 shadow-[0_0_20px_rgba(0,200,83,0.15)] scale-[1.03]'
                      : 'bg-nexus-surface/50 border border-nexus-border text-nexus-muted hover:text-white hover:bg-nexus-surface/70 hover:border-[#00C853]/20 hover:scale-[1.02]'
                  }`}
                >
                  <span className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#00C853,transparent)] ${
                    teamSize === size ? 'opacity-80' : 'opacity-0 group-hover:opacity-30'
                  }`} />
                  {teamSize === size && (
                    <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#00C853] opacity-[0.1] blur-2xl" />
                  )}
                  <div className="relative z-10 font-bold">{label}</div>
                  <div className="relative z-10 text-xs opacity-70">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-nexus-muted block mb-2">Kategorie</label>
            <CategorySelector selected={category} onChange={setCategory} />
          </div>

          <div>
            <label className="text-sm font-medium text-nexus-muted block mb-2">Anzahl Fragen</label>
            <div className="grid grid-cols-4 gap-3">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`relative overflow-hidden py-4 rounded-xl font-bold text-lg transition-all duration-300 cursor-pointer group backdrop-blur-sm ${
                    questionCount === n
                      ? 'bg-nexus-surface/90 text-white border border-[#00C853]/40 shadow-[0_0_20px_rgba(0,200,83,0.15)] scale-[1.03]'
                      : 'bg-nexus-surface/50 border border-nexus-border text-nexus-muted hover:text-white hover:bg-nexus-surface/70 hover:border-[#00C853]/20 hover:scale-[1.02]'
                  }`}
                >
                  {/* Top accent line */}
                  <span className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#00C853,transparent)] ${
                    questionCount === n ? 'opacity-80' : 'opacity-0 group-hover:opacity-30'
                  }`} />
                  {questionCount === n && (
                    <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#00C853] opacity-[0.1] blur-2xl" />
                  )}
                  <span className="relative z-10">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={createLobby}
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl py-4 px-8 font-bold text-lg text-white tracking-wide cursor-pointer transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border hover:border-[#00C853]/40 hover:shadow-[0_0_30px_rgba(0,200,83,0.15)] hover:scale-[1.02]"
          >
            <span className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#00C853,transparent)]" />
            <span className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#00C853] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl" />
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
              <Plus size={18} />
              {loading ? 'Wird erstellt...' : 'Lobby erstellen'}
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
