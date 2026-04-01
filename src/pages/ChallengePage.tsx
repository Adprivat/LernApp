import React, { useEffect, useRef, useState } from 'react';
import { Zap, Users, Plus, Clock, Check, X, Play, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/errorHandler';
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
  const [category, setCategory] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchChallenges = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('challenges')
      .select('*, challenger:profiles!challenger_id(username, is_online, avatar_url), challenged:profiles!challenged_id(username, is_online, avatar_url)')
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });
    setChallenges(data || []);

    const { data: open } = await supabase
      .from('challenges')
      .select('*, challenger:profiles!challenger_id(username, is_online, avatar_url)')
      .eq('is_open', true)
      .eq('status', 'pending')
      .neq('challenger_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setOpenChallenges(open || []);
  };

  useEffect(() => {
    fetchChallenges();

    channelRef.current = supabase
      .channel('challenges_page')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'challenges',
      }, () => fetchChallenges())
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  const createChallenge = async () => {
    if (!user) return;
    setError('');
    if (!category) {
      setError('Bitte wähle eine Kategorie aus');
      return;
    }
    setLoading(true);

    try {
      let challengedId: string | undefined;

      if (!isOpen && targetUsername.trim()) {
        const { data: target, error: targetError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', targetUsername.trim())
          .single();
        if (targetError || !target) throw new Error(`Spieler "${targetUsername}" nicht gefunden`);
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
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const respondToChallenge = async (challenge: Challenge, accept: boolean) => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      if (!accept) {
        // Decline path — unchanged, no race condition risk
        await supabase.from('challenges').update({ status: 'declined' }).eq('id', challenge.id);
        await supabase.from('notifications').insert({
          user_id: challenge.challenger_id,
          type: 'challenge_declined',
          title: 'Herausforderung abgelehnt',
          message: `${user.username} hat deine Herausforderung abgelehnt`,
          is_read: false,
        });
      } else {
        // Accept path — atomic RPC replaces 3 separate calls
        const { data, error } = await supabase.rpc('accept_targeted_challenge', {
          p_challenge_id: challenge.id,
          p_acceptor_id: user.id,
        });

        if (error) {
          if (error.hint === 'already_accepted') {
            setError('Diese Herausforderung ist nicht mehr verfuegbar.');
            fetchChallenges();
            return;
          }
          if (error.hint === 'unauthorized') {
            setError('Nicht autorisiert.');
            return;
          }
          throw error;
        }

        if (data?.session_id) {
          navigate(`/game/${data.session_id}`);
          return;
        }
      }
      fetchChallenges();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const joinOpenChallenge = async (challenge: Challenge) => {
    if (!user) return;
    setLoading(true);
    setError('');

    const { data, error } = await supabase.rpc('accept_open_challenge', {
      p_challenge_id: challenge.id,
      p_joiner_id: user.id,
    });

    setLoading(false);

    if (error) {
      if (error.hint === 'already_accepted') {
        setError('Zu spaet! Diese Herausforderung wurde bereits von jemand anderem angenommen.');
        fetchChallenges();
        return;
      }
      if (error.hint === 'unauthorized') {
        setError('Nicht autorisiert.');
        return;
      }
      setError(error.message || 'Fehler beim Beitreten der Herausforderung');
      return;
    }

    if (data?.session_id) {
      navigate(`/game/${data.session_id}`);
    }
  };

  const cancelChallenge = async (challengeId: string) => {
    setError('');
    const { error } = await supabase.from('challenges').update({ status: 'cancelled' }).eq('id', challengeId);
    if (error) { setError(getErrorMessage(error)); return; }
    fetchChallenges();
  };

  const myReceived = challenges.filter(c => c.challenged_id === user?.id && c.status === 'pending');
  const mySent = challenges.filter(c => c.challenger_id === user?.id && c.status === 'pending');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Zap className="text-amber-400 flex-shrink-0" size={28} />
            Herausforderungen
          </h1>
          <p className="text-nexus-muted mt-1">Fordere andere Spieler heraus</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="group relative overflow-hidden inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm text-white cursor-pointer transition-all duration-300 active:scale-[0.97] bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border hover:border-[#FF6B35]/40 hover:shadow-[0_0_20px_rgba(255,107,53,0.12)] hover:scale-[1.02]"
        >
          <span className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#FF6B35,transparent)]" />
          <span className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-[#FF6B35] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl" />
          <span className="relative z-10 inline-flex items-center gap-2"><Plus size={18} /> Herausfordern</span>
        </button>
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
            <Card className="text-center py-8 text-nexus-muted">
              <Zap size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine Herausforderungen</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {myReceived.map(c => (
                <Card key={c.id} padding="sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar username={c.challenger?.username || '?'} size="sm" isOnline={c.challenger?.is_online} avatarUrl={c.challenger?.avatar_url} />
                    <div>
                      <p className="font-semibold text-white">{c.challenger?.username}</p>
                      <p className="text-xs text-nexus-muted">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                    <Badge variant="warning" size="sm" className="ml-auto">{c.category}</Badge>
                  </div>
                  <p className="text-sm text-nexus-text mb-3">{c.question_count} Fragen</p>
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
            <button onClick={fetchChallenges} className="p-1 rounded-lg text-nexus-muted hover:text-white hover:bg-nexus-surface/60 transition-all duration-300 ml-1 cursor-pointer">
              <RefreshCw size={14} />
            </button>
          </h2>
          {openChallenges.length === 0 ? (
            <Card className="text-center py-8 text-nexus-muted">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Keine offenen Herausforderungen</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {openChallenges.map(c => (
                <Card key={c.id} padding="sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar username={c.challenger?.username || '?'} size="sm" isOnline={c.challenger?.is_online} avatarUrl={c.challenger?.avatar_url} />
                    <div>
                      <p className="font-semibold text-white">{c.challenger?.username}</p>
                      <p className="text-xs text-nexus-muted">wartet auf Gegner...</p>
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
            <Clock size={16} className="text-nexus-muted" />
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
                    <p className="text-xs text-nexus-muted">{c.question_count} Fragen · {c.category}</p>
                  </div>
                  <Badge variant="warning" size="sm">Ausstehend</Badge>
                  <button
                    onClick={() => cancelChallenge(c.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Herausforderung abbrechen"
                  >
                    <X size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create challenge modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setError(''); }} title="Herausforderung erstellen">
        <div className="flex flex-col gap-4">
          <div className="flex bg-nexus-bg/60 rounded-xl p-1 border border-nexus-border">
            <button
              onClick={() => setIsOpen(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 cursor-pointer ${
                !isOpen
                  ? 'bg-nexus-surface/90 text-white border border-[#FF6B35]/30 shadow-[0_0_15px_rgba(255,107,53,0.1)]'
                  : 'text-nexus-muted hover:text-white border border-transparent'
              }`}
            >
              Gezielt herausfordern
            </button>
            <button
              onClick={() => setIsOpen(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 cursor-pointer ${
                isOpen
                  ? 'bg-nexus-surface/90 text-white border border-[#FF6B35]/30 shadow-[0_0_15px_rgba(255,107,53,0.1)]'
                  : 'text-nexus-muted hover:text-white border border-transparent'
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
            <label className="text-sm font-medium text-nexus-muted block mb-2">Kategorie</label>
            <CategorySelector selected={category} onChange={setCategory} />
          </div>

          <div>
            <label className="text-sm font-medium text-nexus-muted block mb-2">Anzahl Fragen</label>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15, 20, 50, 0].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`relative overflow-hidden py-4 rounded-xl font-bold text-lg transition-all duration-300 cursor-pointer group backdrop-blur-sm ${
                    questionCount === n
                      ? 'bg-nexus-surface/90 text-white border border-[#FF6B35]/40 shadow-[0_0_20px_rgba(255,107,53,0.15)] scale-[1.03]'
                      : 'bg-nexus-surface/50 border border-nexus-border text-nexus-muted hover:text-white hover:bg-nexus-surface/70 hover:border-[#FF6B35]/20 hover:scale-[1.02]'
                  }`}
                >
                  {/* Top accent line */}
                  <span className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#FF6B35,transparent)] ${
                    questionCount === n ? 'opacity-80' : 'opacity-0 group-hover:opacity-30'
                  }`} />
                  {questionCount === n && (
                    <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#FF6B35] opacity-[0.1] blur-2xl" />
                  )}
                  <span className="relative z-10">{n === 0 ? '∞' : n}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-nexus-danger/10 border border-nexus-danger/30 rounded-lg px-4 py-3 text-sm text-nexus-danger">
              {error}
            </div>
          )}

          <button
            onClick={createChallenge}
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl py-4 px-8 font-bold text-lg text-white tracking-wide cursor-pointer transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border hover:border-[#FF6B35]/40 hover:shadow-[0_0_30px_rgba(255,107,53,0.15)] hover:scale-[1.02]"
          >
            <span className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#FF6B35,transparent)]" />
            <span className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#FF6B35] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl" />
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
              <Zap size={18} />
              {loading ? 'Wird gesendet...' : 'Herausforderung senden'}
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
