import React, { useEffect, useRef, useState } from 'react';
import { Trophy, Users, Clock, Play, Plus, RefreshCw, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/errorHandler';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { CategorySelector } from '@/components/game/CategorySelector';
import type { Tournament, TournamentParticipant } from '@/types';
import { useNavigate } from 'react-router-dom';

export function TournamentPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<(Tournament & { participants: TournamentParticipant[] })[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*, participants:tournament_participants(*, profile:profiles(username, is_online))')
      .in('status', ['registering', 'active'])
      .order('created_at', { ascending: false });
    setTournaments(data || []);
  };

  useEffect(() => {
    fetchTournaments();
    channelRef.current = supabase
      .channel('tournaments_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchTournaments)
      .subscribe();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const createTournament = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data: t, error: createError } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          status: 'registering',
          max_players: maxPlayers,
          category,
          question_count: questionCount,
          current_round: 0,
        })
        .select()
        .single();

      if (createError || !t) {
        setError(getErrorMessage(createError));
        return;
      }

      await supabase.from('tournament_participants').insert({
        tournament_id: t.id,
        user_id: user.id,
        is_eliminated: false,
        current_round: 0,
        total_score: 0,
      });
      setShowCreate(false);
      setName('');
      fetchTournaments();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournamentId: string) => {
    if (!user) return;
    setError('');
    const { error: joinError } = await supabase.from('tournament_participants').insert({
      tournament_id: tournamentId,
      user_id: user.id,
      is_eliminated: false,
      current_round: 0,
      total_score: 0,
    });
    if (!joinError) fetchTournaments();
    else setError('Bereits angemeldet');
  };

  const startTournament = async (tournament: Tournament & { participants: TournamentParticipant[] }) => {
    if (!user || tournament.status !== 'registering') return;
    setError('');
    if (tournament.participants.length < 2) {
      setError('Mindestens 2 Spieler benötigt');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc('start_tournament', {
      p_tournament_id: tournament.id,
      p_starter_id: user.id,
    });

    setLoading(false);

    if (error) {
      if (error.hint === 'already_started') {
        setError('Dieses Turnier wurde bereits von jemand anderem gestartet.');
        fetchTournaments();
        return;
      }
      if (error.hint === 'unauthorized') {
        setError('Nicht autorisiert.');
        return;
      }
      setError(getErrorMessage(error));
      return;
    }

    if (data?.session_id) {
      navigate(`/game/${data.session_id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Trophy className="text-yellow-400" size={32} />
            Turniere
          </h1>
          <p className="text-nexus-muted mt-1">Kämpfe gegen viele Spieler</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="group relative overflow-hidden inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm text-white cursor-pointer transition-all duration-300 active:scale-[0.97] bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border hover:border-[#B24BFF]/40 hover:shadow-[0_0_20px_rgba(178,75,255,0.12)] hover:scale-[1.02]"
        >
          <span className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#B24BFF,transparent)]" />
          <span className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#B24BFF] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl" />
          <span className="relative z-10 inline-flex items-center gap-2"><Plus size={18} /> Turnier erstellen</span>
        </button>
      </div>

      {error && (
        <div className="bg-nexus-danger/10 border border-nexus-danger/30 rounded-lg px-4 py-3 text-sm text-nexus-danger mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {tournaments.length === 0 ? (
          <Card className="text-center py-16 text-nexus-muted">
            <Trophy size={48} className="mx-auto mb-4 opacity-30 text-yellow-400" />
            <h2 className="text-xl font-bold text-white mb-2">Keine aktiven Turniere</h2>
            <p className="text-sm">Erstelle das erste Turnier!</p>
          </Card>
        ) : (
          tournaments.map(t => {
            const isRegistered = t.participants.some((p: any) => p.user_id === user?.id);
            const isCreator = t.participants[0]?.user_id === user?.id;
            const isFull = t.participants.length >= t.max_players;

            return (
              <Card key={t.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy size={18} className="text-yellow-400" />
                      <h2 className="text-xl font-bold text-white">{t.name}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-nexus-muted">
                      <span>{t.category}</span>
                      <span>·</span>
                      <span>{t.question_count} Fragen</span>
                      <span>·</span>
                      <span>Runde {t.current_round}</span>
                    </div>
                  </div>
                  <Badge variant={t.status === 'registering' ? 'info' : 'success'}>
                    {t.status === 'registering' ? 'Anmeldung offen' : 'Läuft'}
                  </Badge>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex -space-x-2">
                    {t.participants.slice(0, 8).map((p: any, idx: number) => (
                      <Avatar
                        key={p.id}
                        username={p.profile?.username || '?'}
                        size="sm"
                        className="ring-2 ring-nexus-bg"
                      />
                    ))}
                    {t.participants.length > 8 && (
                      <div className="w-8 h-8 rounded-full bg-nexus-surface ring-2 ring-nexus-bg flex items-center justify-center text-xs text-nexus-muted">
                        +{t.participants.length - 8}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-nexus-muted">
                    {t.participants.length}/{t.max_players} Spieler
                  </span>
                  {isFull && <Badge variant="warning" size="sm">Voll</Badge>}
                </div>

                <div className="flex gap-2">
                  {t.status === 'registering' && (
                    <>
                      {!isRegistered && !isFull && (
                        <Button size="sm" variant="primary" onClick={() => joinTournament(t.id)}>
                          <Users size={14} />
                          Anmelden
                        </Button>
                      )}
                      {isRegistered && (
                        <Badge variant="success" size="sm">Angemeldet ✓</Badge>
                      )}
                      {isCreator && t.participants.length >= 2 && (
                        <Button size="sm" variant="success" onClick={() => startTournament(t)}>
                          <Play size={14} />
                          Turnier starten
                        </Button>
                      )}
                    </>
                  )}
                  {t.status === 'active' && isRegistered && (
                    <Badge variant="warning">Turnier läuft...</Badge>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create tournament modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Turnier erstellen" size="lg">
        <div className="flex flex-col gap-4">
          <Input
            label="Turnierbezeichnung"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z.B. Wissens-Cup 2024"
            fullWidth
          />

          <div>
            <label className="text-sm font-medium text-nexus-muted block mb-2">Maximale Teilnehmer</label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 8, 16, 32].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`py-2 rounded-xl font-bold transition-all duration-300 cursor-pointer ${
                    maxPlayers === n
                      ? 'bg-gradient-to-b from-[#FFB300] to-[#E6A200] text-white shadow-[0_0_20px_rgba(255,179,0,0.3)] border border-white/10'
                      : 'bg-nexus-surface/60 border border-nexus-border text-nexus-muted hover:text-white hover:bg-nexus-surface hover:border-nexus-accent/20'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-nexus-muted block mb-2">Kategorie</label>
            <CategorySelector selected={category} onChange={setCategory} />
          </div>

          <div>
            <label className="text-sm font-medium text-nexus-muted block mb-2">Fragen pro Runde</label>
            <div className="grid grid-cols-5 gap-3">
              {[5, 10, 15, 20, 50].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`relative overflow-hidden py-4 rounded-xl font-bold text-lg transition-all duration-300 cursor-pointer group backdrop-blur-sm ${
                    questionCount === n
                      ? 'bg-nexus-surface/90 text-white border border-[#B24BFF]/40 shadow-[0_0_20px_rgba(178,75,255,0.15)] scale-[1.03]'
                      : 'bg-nexus-surface/50 border border-nexus-border text-nexus-muted hover:text-white hover:bg-nexus-surface/70 hover:border-[#B24BFF]/20 hover:scale-[1.02]'
                  }`}
                >
                  {/* Top accent line */}
                  <span className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#B24BFF,transparent)] ${
                    questionCount === n ? 'opacity-80' : 'opacity-0 group-hover:opacity-30'
                  }`} />
                  {questionCount === n && (
                    <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#B24BFF] opacity-[0.1] blur-2xl" />
                  )}
                  <span className="relative z-10">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={createTournament}
            disabled={loading || !name.trim()}
            className="group relative w-full overflow-hidden rounded-2xl py-4 px-8 font-bold text-lg text-white tracking-wide cursor-pointer transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border hover:border-[#B24BFF]/40 hover:shadow-[0_0_30px_rgba(178,75,255,0.15)] hover:scale-[1.02]"
          >
            <span className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#B24BFF,transparent)]" />
            <span className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#B24BFF] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl" />
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
              <Trophy size={18} />
              {loading ? 'Wird erstellt...' : 'Turnier erstellen'}
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
