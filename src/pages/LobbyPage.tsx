import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Crown, Users, Play, Check, Copy, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { GameChat } from '@/components/game/GameChat';
import type { GameSession, GamePlayer } from '@/types';

export function LobbyPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchData = async () => {
    if (!sessionId) return;
    const { data: s, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (sessionError) {
      console.error('Failed to load lobby session:', sessionError.message);
      return;
    }
    setSession(s);

    const { data: p } = await supabase
      .from('game_players')
      .select('*, profile:profiles(username, is_online)')
      .eq('session_id', sessionId);
    setPlayers(p || []);

    if (s?.status === 'active') {
      navigate(`/game/${sessionId}`);
    }
  };

  useEffect(() => {
    fetchData();

    // Join if not already in lobby
    const joinLobby = async () => {
      if (!user || !sessionId) return;
      const { data: existing, error: existingError } = await supabase
        .from('game_players')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Failed to check lobby membership:', existingError.message);
        return;
      }

      if (!existing && (!existingError || existingError.code === 'PGRST116')) {
        await supabase.from('game_players').insert({
          session_id: sessionId,
          user_id: user.id,
          team: 2,
          score: 0,
          correct_answers: 0,
          wrong_answers: 0,
          is_ready: false,
          is_finished: false,
        });
        fetchData();
      }
    };
    joinLobby();

    channelRef.current = supabase
      .channel(`lobby:${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_players',
        filter: `session_id=eq.${sessionId}`,
      }, fetchData)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new.status === 'active') {
          navigate(`/game/${sessionId}`);
        }
        setSession(payload.new as GameSession);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, user]);

  const toggleReady = async () => {
    const myPlayer = players.find(p => p.user_id === user?.id);
    if (!myPlayer) return;
    await supabase.from('game_players').update({ is_ready: !myPlayer.is_ready }).eq('id', myPlayer.id);
    fetchData();
  };

  const startGame = async () => {
    if (!sessionId) return;
    setLoading(true);
    await supabase.from('game_sessions').update({
      status: 'active',
      question_start_time: new Date().toISOString(),
    }).eq('id', sessionId);
    navigate(`/game/${sessionId}`);
  };

  const leaveLobby = async () => {
    if (user && sessionId) {
      await supabase.from('game_players')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    }
    navigate(-1);
  };

  const copyCode = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!session) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-nexus-muted text-center">
        <div className="w-8 h-8 border-2 border-nexus-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Lobby wird geladen...
      </div>
    </div>
  );

  const isHost = session.host_id === user?.id;
  const myPlayer = players.find(p => p.user_id === user?.id);
  const allReady = players.length > 1 && players.every(p => p.is_ready || p.user_id === session.host_id);
  const maxPlayers = (session as any).max_players || 4;

  const team1 = players.filter(p => p.team === 1);
  const team2 = players.filter(p => p.team === 2);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={leaveLobby}
        className="flex items-center gap-2 text-nexus-muted hover:text-white mb-6 transition-all duration-300 px-3 py-1.5 rounded-lg hover:bg-nexus-surface/60 border border-transparent hover:border-nexus-border cursor-pointer"
      >
        <ArrowLeft size={18} />
        Lobby verlassen
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Lobby info */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-black text-white">Lobby</h1>
                <p className="text-nexus-muted text-sm">{session.category} · {session.question_count} Fragen</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={players.length >= maxPlayers ? 'danger' : 'success'}>
                  {players.length}/{maxPlayers} Spieler
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={copyCode}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Kopiert!' : 'Code kopieren'}
              </Button>
              <code className="flex-1 px-3 py-1.5 bg-nexus-bg border border-nexus-border rounded-lg text-xs text-nexus-muted font-mono truncate">
                {sessionId}
              </code>
            </div>
          </Card>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { team: 1, players: team1, color: 'border-blue-500/30 bg-blue-500/5', badge: 'info', label: 'Team Blau' },
              { team: 2, players: team2, color: 'border-red-500/30 bg-red-500/5', badge: 'danger', label: 'Team Rot' },
            ].map(({ team, players: tp, color, badge, label }) => (
              <Card key={team} className={`border ${color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm">{label}</h3>
                  <Badge variant={badge as any} size="sm">{tp.length}</Badge>
                </div>
                {tp.length === 0 ? (
                  <div className="text-center py-4 text-nexus-muted text-sm">Leer</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {tp.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Avatar username={p.profile?.username || '?'} size="sm" isOnline={p.profile?.is_online} />
                        <span className="text-sm text-white flex-1 truncate">{p.profile?.username}</span>
                        {p.user_id === session.host_id && <Crown size={12} className="text-yellow-400 flex-shrink-0" />}
                        {p.is_ready && p.user_id !== session.host_id && (
                          <Check size={12} className="text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!isHost && (
              <Button
                variant={myPlayer?.is_ready ? 'success' : 'secondary'}
                fullWidth
                onClick={toggleReady}
              >
                <Check size={18} />
                {myPlayer?.is_ready ? 'Bereit ✓' : 'Bereit melden'}
              </Button>
            )}
            {isHost && (
              <Button
                variant="primary"
                fullWidth
                loading={loading}
                disabled={players.length < 2}
                onClick={startGame}
              >
                <Play size={18} />
                Spiel starten {players.length < 2 && '(min. 2 Spieler)'}
              </Button>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="h-[500px]">
          <GameChat sessionId={session.id} />
        </div>
      </div>
    </div>
  );
}
