import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Settings, Play } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { CategorySelector } from '@/components/game/CategorySelector';
import { QuestionCard } from '@/components/game/QuestionCard';
import { GameResultScreen } from '@/components/game/GameResultScreen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

type PageState = 'setup' | 'playing' | 'finished';

export function LearnPage() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'general';
  const initialCount = parseInt(searchParams.get('count') || '10');

  const [pageState, setPageState] = useState<PageState>('setup');
  const [category, setCategory] = useState(initialCategory);
  const [questionCount, setQuestionCount] = useState(initialCount);
  const { user } = useAuthStore();
  const {
    session, questions, currentQuestion, currentQuestionIndex,
    answers, gameOver, loading, createSoloSession, submitAnswer, nextQuestion, endGame, reset
  } = useGameStore();
  const navigate = useNavigate();

  const handleStart = async () => {
    try {
      await createSoloSession(category, questionCount);
      setPageState('playing');
    } catch (err: any) {
      alert(err.message);
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
        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4">
          <BookOpen size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white">Selbst lernen</h1>
        <p className="text-slate-400 mt-2">Lerne in deinem eigenen Tempo</p>
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
            <Settings size={18} className="text-slate-400" />
            Anzahl Fragen
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {[5, 10, 15, 20].map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`py-3 rounded-xl font-bold text-lg transition-all ${
                  questionCount === count
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            20 Sekunden pro Frage
          </p>
        </Card>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onClick={handleStart}
        >
          <Play size={20} />
          Spiel starten
        </Button>
      </div>
    </div>
  );
}
