import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { QuestionCard } from '@/components/game/QuestionCard';
import { Scoreboard } from '@/components/game/Scoreboard';
import { GameChat } from '@/components/game/GameChat';
import { GameResultScreen } from '@/components/game/GameResultScreen';
import { Button } from '@/components/ui/Button';
import { calculateQuestionTime } from '@/lib/utils';

export function GamePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    session, players, questions, currentQuestion, currentQuestionIndex,
    answers, gameOver, joinSession, submitAnswer, nextQuestion, endGame, reset
  } = useGameStore();
  const [localPlayers, setLocalPlayers] = useState(players);
  const [showQuit, setShowQuit] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (sessionId) joinSession(sessionId);
    return () => { reset(); };
  }, [sessionId]);

  useEffect(() => {
    setLocalPlayers(players);
  }, [players]);

  useEffect(() => {
    if (!sessionId) return;

    channelRef.current = supabase
      .channel(`game:${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_players',
        filter: `session_id=eq.${sessionId}`,
      }, async () => {
        const { data } = await supabase
          .from('game_players')
          .select('*, profile:profiles(username, is_online)')
          .eq('session_id', sessionId);
        setLocalPlayers(data || []);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId]);

  const quitGame = async () => {
    await endGame();
    reset();
    navigate('/');
  };

  const handleAnswer = async (index: number, timeTaken: number) => {
    await submitAnswer(index, timeTaken);
    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        endGame();
      } else {
        nextQuestion();
      }
    }, 1500);
  };

  const handleTimeUp = () => {
    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        endGame();
      } else {
        nextQuestion();
      }
    }, 1500);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-nexus-muted text-center">
          <div className="w-8 h-8 border-2 border-nexus-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Spiel wird geladen...
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <GameResultScreen
          players={localPlayers.length > 0 ? localPlayers : players}
          questions={questions}
          answers={answers}
          currentUserId={user?.id || ''}
          mode={session.mode}
          onPlayAgain={() => {
            const modeRoutes: Record<string, string> = {
              challenge: '/challenge',
              group: '/groups',
              tournament: '/tournament',
            };
            navigate(modeRoutes[session.mode] || '/');
          }}
        />
      </div>
    );
  }

  const isMultiplayer = session.mode !== 'solo';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => setShowQuit(true)}
        className="fixed top-20 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexus-surface/80 border border-nexus-border text-nexus-muted hover:text-red-400 hover:border-red-400/30 text-sm transition-colors"
      >
        <X size={14} /> Abbrechen
      </button>

      {showQuit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-nexus-surface border border-nexus-border rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-white text-lg mb-2">Spiel abbrechen?</h3>
            <p className="text-nexus-muted text-sm mb-5">Deine aktuellen Punkte gehen verloren.</p>
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={() => setShowQuit(false)}>Weiterspielen</Button>
              <Button variant="danger" fullWidth onClick={quitGame}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}

      <div className={`grid ${isMultiplayer ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
        {/* Question */}
        <div className={isMultiplayer ? 'lg:col-span-2' : ''}>
          {currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              onAnswer={handleAnswer}
              timeLeft={calculateQuestionTime(currentQuestion.question, currentQuestion.answers)}
              onTimeUp={handleTimeUp}
              selectedAnswer={answers[currentQuestionIndex]}
              revealed={answers[currentQuestionIndex] !== undefined}
            />
          ) : (
            <div className="text-center text-nexus-muted py-20">
              Warte auf nächste Frage...
            </div>
          )}
        </div>

        {/* Multiplayer sidebar */}
        {isMultiplayer && (
          <div className="flex flex-col gap-4">
            {/* Live scoreboard */}
            <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg p-4">
              <h3 className="font-bold text-white mb-3 text-sm">Live-Rangliste</h3>
              <Scoreboard
                players={localPlayers.length > 0 ? localPlayers : players}
                currentUserId={user?.id}
              />
            </div>

            {/* Chat */}
            <div className="flex-1">
              <GameChat sessionId={session.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
