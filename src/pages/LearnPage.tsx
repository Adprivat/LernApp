import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Settings, Play } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { CategorySelector } from '@/components/game/CategorySelector';
import { QuestionCard } from '@/components/game/QuestionCard';
import { GameResultScreen } from '@/components/game/GameResultScreen';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/lib/errorHandler';

type PageState = 'setup' | 'playing' | 'finished';

export function LearnPage() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'general';
  const initialCount = parseInt(searchParams.get('count') || '10');

  const [pageState, setPageState] = useState<PageState>('setup');
  const [category, setCategory] = useState(initialCategory);
  const [questionCount, setQuestionCount] = useState(initialCount);
  const [error, setError] = useState('');
  const { user } = useAuthStore();
  const {
    session, questions, currentQuestion, currentQuestionIndex,
    answers, gameOver, loading, createSoloSession, submitAnswer, nextQuestion, endGame, reset
  } = useGameStore();
  const navigate = useNavigate();

  const handleStart = async () => {
    setError('');
    try {
      await createSoloSession(category, questionCount);
      setPageState('playing');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleAnswer = async (index: number, timeTaken: number) => {
    await submitAnswer(index, timeTaken);
    setTimeout(() => {
      nextQuestion();
      if (currentQuestionIndex + 1 >= questions.length) {
        setPageState('finished');
      }
    }, 1500);
  };

  const handleTimeUp = () => {
    setTimeout(() => {
      nextQuestion();
      if (currentQuestionIndex + 1 >= questions.length) {
        setPageState('finished');
      }
    }, 1500);
  };

  const handlePlayAgain = () => {
    reset();
    setPageState('setup');
  };

  if (pageState === 'finished' || gameOver) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <GameResultScreen
          players={[{
            id: '',
            session_id: session?.id || '',
            user_id: user?.id || '',
            score: questions.reduce((sum, _, idx) => {
              const a = answers[idx];
              if (a === undefined) return sum;
              const q = questions[idx];
              return sum + (a === q.correct_index ? 100 : 0);
            }, 0),
            correct_answers: questions.filter((q, idx) => answers[idx] === q.correct_index).length,
            wrong_answers: questions.filter((q, idx) => answers[idx] !== undefined && answers[idx] !== q.correct_index).length,
            is_ready: true,
            is_finished: true,
            profile: user || undefined,
          }]}
          questions={questions}
          answers={answers}
          currentUserId={user?.id || ''}
          onPlayAgain={handlePlayAgain}
          mode="solo"
        />
      </div>
    );
  }

  if (pageState === 'playing' && currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          timeLeft={20}
          onTimeUp={handleTimeUp}
        />
      </div>
    );
  }

  // Setup
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="relative inline-flex items-center justify-center w-14 h-14 bg-nexus-surface/80 backdrop-blur-sm rounded-xl mb-4 border border-[#2E5BFF]/25 shadow-[0_0_20px_rgba(46,91,255,0.15)] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent,#2E5BFF,transparent)]" />
          <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-[#2E5BFF] opacity-[0.15] blur-xl" />
          <BookOpen size={26} className="text-nexus-accent relative z-10 drop-shadow-[0_0_6px_rgba(151,169,255,0.4)]" />
        </div>
        <h1 className="text-3xl font-black text-white">Selbst lernen</h1>
        <p className="text-nexus-muted mt-2">Lerne in deinem eigenen Tempo</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Category */}
        <Card>
          <h2 className="font-bold text-white mb-4">Kategorie wählen</h2>
          <CategorySelector selected={category} onChange={setCategory} />
        </Card>

        {/* Question count */}
        <Card>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Settings size={18} className="text-nexus-accent" />
            Anzahl Fragen
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[5, 10, 15, 20, 50, 0].map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`relative overflow-hidden py-4 rounded-xl font-bold text-lg transition-all duration-300 cursor-pointer group backdrop-blur-sm ${
                  questionCount === count
                    ? 'bg-nexus-surface/90 text-white border border-[#2E5BFF]/40 shadow-[0_0_20px_rgba(46,91,255,0.15)] scale-[1.03]'
                    : 'bg-nexus-surface/50 border border-nexus-border text-nexus-muted hover:text-white hover:bg-nexus-surface/70 hover:border-nexus-accent/20 hover:scale-[1.02]'
                }`}
              >
                {/* Top accent line */}
                <span className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#2E5BFF,transparent)] ${
                  questionCount === count ? 'opacity-80' : 'opacity-0 group-hover:opacity-30'
                }`} />
                {/* Radial glow blob */}
                {questionCount === count && (
                  <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-[#2E5BFF] opacity-[0.1] blur-2xl" />
                )}
                <span className="relative z-10">{count === 0 ? '∞' : count}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-nexus-muted mt-3 text-center">
            ⏱ 20 Sekunden pro Frage
          </p>
        </Card>

        {error && (
          <div className="bg-nexus-danger/10 border border-nexus-danger/30 rounded-lg px-4 py-3 text-sm text-nexus-danger">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-2xl py-4 px-8 font-bold text-lg text-white tracking-wide cursor-pointer transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border hover:border-[#2E5BFF]/40 hover:shadow-[0_0_30px_rgba(46,91,255,0.15)] hover:scale-[1.02]"
        >
          {/* Top accent line */}
          <span className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(90deg,transparent,#2E5BFF,transparent)]" />
          {/* Radial glow blob */}
          <span className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#2E5BFF] opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl" />
          <span className="relative z-10 inline-flex items-center gap-2">
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play size={20} />
            )}
            Spiel starten
          </span>
        </button>
      </div>
    </div>
  );
}
