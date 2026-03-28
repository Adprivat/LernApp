import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { QuestionCard } from '@/components/game/QuestionCard';
import { Scoreboard } from '@/components/game/Scoreboard';
import { GameChat } from '@/components/game/GameChat';
import { GameResultScreen } from '@/components/game/GameResultScreen';

export function GamePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    session, players, questions, currentQuestion, currentQuestionIndex,
    answers, gameOver, loadSession, submitAnswer, nextQuestion, endGame, reset
  } = useGameStore();
  const [localPlayers, setLocalPlayers] = useState(players);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (sessionId) loadSession(sessionId);
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

    return () => { channelRef.current?.unsubscribe(); };
  }, [sessionId]);

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
        <div className="text-slate-400 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
          onPlayAgain={() => navigate('/')}
        />
      </div>
    );
  }

  const isMultiplayer = session.mode !== 'solo';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className={`grid ${isMultiplayer ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
        {/* Question */}
        <div className={isMultiplayer ? 'lg:col-span-2' : ''}>
          {currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              onAnswer={handleAnswer}
              timeLeft={20}
              onTimeUp={handleTimeUp}
              selectedAnswer={answers[currentQuestionIndex]}
              revealed={answers[currentQuestionIndex] !== undefined}
            />
          ) : (
            <div className="text-center text-slate-400 py-20">
              Warte auf nächste Frage...
            </div>
          )}
        </div>

        {/* Multiplayer sidebar */}
        {isMultiplayer && (
          <div className="flex flex-col gap-4">
            {/* Live scoreboard */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
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
