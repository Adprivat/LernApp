import React, { useEffect, useState } from 'react';
import { Zap, Users, Plus, Clock, Check, X, Play, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { CategorySelector } from '@/components/game/CategorySelector';
import type { Challenge } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function ChallengePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [openChallenges, setOpenChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');
  const [category, setCategory] = useState('general');
  const [questionCount, setQuestionCount] = useState(10);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchChallenges = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('challenges')
      .select('*, challenger:profiles!challenger_id(username, is_online), challenged:profiles!challenged_id(username, is_online)')
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });
    setChallenges(data || []);

    const { data: open } = await supabase
      .from('challenges')
      .select('*, challenger:profiles!challenger_id(username, is_online)')
      .eq('is_open', true)
      .eq('status', 'pending')
      .neq('challenger_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setOpenChallenges(open || []);
  };

  useEffect(() => {
    fetchChallenges();

    const channel = supabase
      .channel('challenges_page')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'challenges',
      }, () => fetchChallenges())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  const createChallenge = async () => {
    if (!user) return;
    setError('');
    setLoading(true);

    try {
      let challengedId: string | undefined;

      if (!isOpen && targetUsername.trim()) {
        const { data: target } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', targetUsername.trim())
          .single();
        if (!target) throw new Error(`Spieler "${targetUsername}" nicht gefunden`);
        if (target.id === user.id) throw new Error('Du kannst dich nicht selbst herausfordern');
        challengedId = target.id;
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: err } = await supabase.from('challenges').insert({
        challenger_id: user.id,
        challenged_id: challengedId || null,
        category,
        question_count: questionCount,
        is_open: isOpen || !challengedId,
        status: 'pending',
        expires_at: expiresAt,
      });

      if (err) throw err;

      if (challengedId) {
        // Send notification
        await supabase.from('notifications').insert({
          user_id: challengedId,
          type: 'challenge_received',
          title: 'Neue Herausforderung!',
          message: `${user.username} fordert dich heraus!`,
          data: { challenger_id: user.id },
          is_read: false,
        });
      }

      setShowCreate(false);
      setTargetUsername('');
      fetchChallenges();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const respondToChallenge = async (challenge: Challenge, accept: boolean) => {
    if (!user) return;
    setLoading(true);

    try {
      if (!accept) {
        await supabase.from('challenges').update({ status: 'declined' }).eq('id', challenge.id);
        await supabase.from('notifications').insert({
          user_id: challenge.challenger_id,
          type: 'challenge_declined',
          title: 'Herausforderung abgelehnt',
          message: `${user.username} hat deine Herausforderung abgelehnt`,
          is_read: false,
        });
      } else {
        // Create game session
        const { data: session } = await supabase
          .from('game_sessions')
          .insert({
            mode: 'challenge',
            status: 'waiting',
            category: challenge.category,
            question_count: challenge.question_count,
            time_per_question: 20,
            current_question_index: 0,
            host_id: challenge.challenger_id,
          })
          .select()
          .single();

        if (!session) throw new Error('Spiel konnte nicht erstellt werden');

        await supabase.from('challenges').update({
          status: 'accepted',
          session_id: session.id,
        }).eq('id', challenge.id);

        await supabase.from('notifications').insert({
          user_id: challenge.challenger_id,
          type: 'challenge_accepted',
          title: 'Herausforderung angenommen!',
          message: `${user.username} hat deine Herausforderung angenommen!`,
          data: { session_id: session.id },
          is_read: false,
        });

        navigate(`/game/${session.id}`);
      }
      fetchChallenges();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinOpenChallenge = async (challenge: Challenge) => {
    if (!user) return;
    const { data: session } = await supabase
      .from('game_sessions')
      .insert({
        mode: 'challenge',
        status: 'waiting',
        category: challenge.category,
        question_count: challenge.question_count,
        time_per_question: 20,
        current_question_index: 0,
        host_id: challenge.challenger_id,
      })
      .select()
      .single();

    if (!session) return;

    await supabase.from('challenges').update({
      status: 'accepted',
      challenged_id: user.id,
      session_id: session.id,
    }).eq('id', challenge.id);

    await supabase.from('notifications').insert({
      user_id: challenge.challenger_id,
      type: 'challenge_accepted',
      title: 'Jemand hat deine offene Herausforderung angenommen!',
      message: `${user.username} spielt gegen dich!`,
      data: { session_id: session.id },
      is_read: false,
    });

    navigate(`/game/${session.id}`);
  };

  const myReceived = challenges.filter(c => c.challenged_id === user?.id && c.status === 'pending');
  const mySent = challenges.filter(c => c.challenger_id === user?.id && c.status === 'pending');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Zap className="text-amber-400" size={32} />
            Herausforderungen
          </h1>
          <p className="text-slate-400 mt-1">Fordere andere Spieler heraus</p>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="primary">
          <Plus size={18} />
          Herausfordern
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Received challenges */}
        <div>
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            Erhalten
            {myReceived.length > 0 && (
              <Badge variant="warning" size="sm">{myReceived.length}</Badge>
            )}
          </h2>
          {myReceived.length === 0 ? (
            <Card className="text-center py-8 text-slate-400">
              <Zap size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine Herausforderungen</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {myReceived.map(c => (
                <Card key={c.id} padding="sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar username={c.challenger?.username || '?'} size="sm" isOnline={c.challenger?.is_online} />
                    <div>
                      <p className="font-semibold text-white">{c.challenger?.username}</p>
                      <p className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                    <Badge variant="warning" size="sm" className="ml-auto">{c.category}</Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{c.question_count} Fragen</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => respondToChallenge(c, true)}
                      loading={loading}
                      fullWidth
                    >
                      <Check size={14} /> Annehmen
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => respondToChallenge(c, false)}
                      loading={loading}
                      fullWidth
                    >
                      <X size={14} /> Ablehnen
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Open challenges pool */}
        <div>
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            Offene Herausforderungen
            <button onClick={fetchChallenges} className="text-slate-400 hover:text-white ml-1">
              <RefreshCw size={14} />
            </button>
          </h2>
          {openChallenges.length === 0 ? (
            <Card className="text-center py-8 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine offenen Herausforderungen</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {openChallenges.map(c => (
                <Card key={c.id} padding="sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar username={c.challenger?.username || '?'} size="sm" isOnline={c.challenger?.is_online} />
                    <div>
                      <p className="font-semibold text-white">{c.challenger?.username}</p>
                      <p className="text-xs text-slate-400">wartet auf Gegner...</p>
                    </div>
                    <Badge variant="info" size="sm" className="ml-auto">{c.category}</Badge>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{c.question_count} Fragen</p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => joinOpenChallenge(c)}
                    fullWidth
                  >
                    <Play size={14} />
                    Mitspielen
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sent challenges */}
      {mySent.length > 0 && (
        <div className="mt-6">
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            Gesendete Herausforderungen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mySent.map(c => (
              <Card key={c.id} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">
                      {c.is_open ? 'Offene Herausforderung' : `→ ${c.challenged?.username || '?'}`}
                    </p>
                    <p className="text-xs text-slate-400">{c.question_count} Fragen · {c.category}</p>
                  </div>
                  <Badge variant="warning" size="sm">Ausstehend</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create challenge modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setError(''); }} title="Herausforderung erstellen">
        <div className="flex flex-col gap-4">
          <div className="flex bg-slate-700/50 rounded-xl p-1">
            <button
              onClick={() => setIsOpen(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isOpen ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
              }`}
            >
              Gezielt herausfordern
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                isOpen ? 'bg-white text-slate-900 shadow' : 'text-slate-400'
              }`}
            >
              Offene Herausforderung
            </button>
          </div>

          {!isOpen && (
            <Input
              label="Benutzername des Gegners"
              value={targetUsername}
              onChange={e => setTargetUsername(e.target.value)}
              placeholder="Spielername eingeben..."
            />
          )}

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
                    questionCount === n ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button variant="primary" fullWidth onClick={createChallenge} loading={loading}>
            <Zap size={18} />
            Herausforderung senden
          </Button>
        </div>
      </Modal>
    </div>
  );
}
