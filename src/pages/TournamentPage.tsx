import React, { useEffect, useState } from 'react';
import { Trophy, Users, Clock, Play, Plus, RefreshCw, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
    const channel = supabase
      .channel('tournaments_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchTournaments)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []);

  const createTournament = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      const { data: t } = await supabase
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

      if (t) {
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
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournamentId: string) => {
    if (!user) return;
    const { error } = await supabase.from('tournament_participants').insert({
      tournament_id: tournamentId,
      user_id: user.id,
      is_eliminated: false,
      current_round: 0,
      total_score: 0,
    });
    if (!error) fetchTournaments();
    else alert('Bereits angemeldet');
  };

  const startTournament = async (tournament: any) => {
    if (!user || tournament.status !== 'registering') return;
    if (tournament.participants.length < 2) {
      alert('Mindestens 2 Spieler benötigt');
      return;
    }

    const { data: session } = await supabase
      .from('game_sessions')
      .insert({
        mode: 'tournament',
        status: 'active',
        category: tournament.category,
        question_count: tournament.question_count,
        time_per_question: 20,
        current_question_index: 0,
        host_id: user.id,
        tournament_id: tournament.id,
      })
      .select()
      .single();

    if (session) {
      await supabase.from('tournaments').update({
        status: 'active',
        started_at: new Date().toISOString(),
        current_round: 1,
      }).eq('id', tournament.id);

      for (const p of tournament.participants) {
        await supabase.from('game_players').insert({
          session_id: session.id,
          user_id: p.user_id,
          score: 0,
          correct_answers: 0,
          wrong_answers: 0,
          is_ready: true,
          is_finished: false,
        });
      }

      navigate(`/game/${session.id}`);
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
          <p className="text-slate-400 mt-1">Kämpfe gegen viele Spieler</p>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="primary">
          <Plus size={18} />
          Turnier erstellen
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {tournaments.length === 0 ? (
          <Card className="text-center py-16 text-slate-400">
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
                    <div className="flex items-center gap-2 text-sm text-slate-400">
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
                        className="ring-2 ring-slate-800"
                      />
                    ))}
                    {t.participants.length > 8 && (
                      <div className="w-8 h-8 rounded-full bg-slate-600 ring-2 ring-slate-800 flex items-center justify-center text-xs text-slate-300">
                        +{t.participants.length - 8}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-slate-400">
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
            <label className="text-sm font-medium text-slate-300 block mb-2">Maximale Teilnehmer</label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 8, 16, 32].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxPlayers(n)}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    maxPlayers === n ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Kategorie</label>
            <CategorySelector selected={category} onChange={setCategory} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">Fragen pro Runde</label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    questionCount === n ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" fullWidth onClick={createTournament} loading={loading} disabled={!name.trim()}>
            <Trophy size={18} />
            Turnier erstellen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
