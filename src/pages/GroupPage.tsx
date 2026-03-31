import React, { useEffect, useState } from 'react';
import { Users, Plus, Play, Copy, Check, Crown, RefreshCw } from 'lucide-react';
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
  const [category, setCategory] = useState('general');
  const [questionCount, setQuestionCount] = useState(10);
  const [teamSize, setTeamSize] = useState(2);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchLobbies = async () => {
    const { data } = await supabase
      .from('game_sessions')
      .select('*, players:game_players(*, profile:profiles(username, is_online))')
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Users className="text-emerald-400" size={32} />
            Gruppenspiele
          </h1>
          <p className="text-slate-400 mt-1">2 bis 4 Teams gegeneinander</p>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="success">
          <Plus size={18} />
          Lobby erstellen
        </Button>
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Lobby list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            Offene Lobbys
          </h2>
          <button onClick={fetchLobbies} className="text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {lobbies.length === 0 ? (
          <Card className="text-center py-12 text-slate-400">
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
                      <p className="text-xs text-slate-400">{lobby.category} · {lobby.question_count} Fragen</p>
                    </div>
                    <Badge variant={isFull ? 'danger' : 'success'} size="sm">
                      {players.length}/{maxPlayers}
                    </Badge>
                  </div>

                  {/* Players */}
                  <div className="flex -space-x-2 mb-3">
                    {players.slice(0, 6).map((p: any) => (
                      <Avatar key={p.id} username={p.profile?.username || '?'} size="sm" className="ring-2 ring-slate-800" />
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
            <label className="text-sm font-medium text-slate-300 block mb-2">Spielergröße</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ size: 2, label: '2v2', desc: '4 Spieler' }, { size: 3, label: '3v3', desc: '6 Spieler' }, { size: 4, label: '4v4', desc: '8 Spieler' }].map(({ size, label, desc }) => (
                <button
                  key={size}
                  onClick={() => setTeamSize(size)}
                  className={`py-3 rounded-xl transition-all ${
                    teamSize === size ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="font-bold">{label}</div>
                  <div className="text-xs opacity-70">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Kategorie</label>
            <CategorySelector selected={category} onChange={setCategory} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Anzahl Fragen</label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    questionCount === n ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Button variant="success" fullWidth onClick={createLobby} loading={loading}>
            <Plus size={18} />
            Lobby erstellen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
