import React from 'react';
import { Trophy, Star, Target, Zap, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Scoreboard } from './Scoreboard';
import type { GamePlayer, Question, GameAnswer } from '@/types';
import { Link } from 'react-router-dom';

interface GameResultScreenProps {
  players: GamePlayer[];
  questions: Question[];
  answers: Record<number, number>;
  currentUserId: string;
  onPlayAgain?: () => void;
  mode: string;
}

export function GameResultScreen({
  players, questions, answers, currentUserId, onPlayAgain, mode
}: GameResultScreenProps) {
  const myPlayer = players.find(p => p.user_id === currentUserId);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex(p => p.user_id === currentUserId) + 1;
  const isWinner = myRank === 1 && players.length > 1;
  const total = questions.length;
  const correct = myPlayer?.correct_answers || 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto py-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">
          {isWinner ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : mode === 'solo' ? '📊' : '🎮'}
        </div>
        <h1 className="text-3xl font-black text-white mb-2">
          {mode === 'solo' ? 'Ergebnis' : isWinner ? 'Gewonnen!' : 'Spiel beendet'}
        </h1>
        {players.length > 1 && (
          <p className="text-slate-400">
            {isWinner ? 'Glückwunsch, du hast gewonnen!' : `Du bist auf Platz ${myRank}`}
          </p>
        )}
      </div>

      {/* My stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-indigo-400">{myPlayer?.score.toLocaleString() || 0}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Star size={10} />
            Punkte
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-emerald-400">{accuracy}%</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Target size={10} />
            Genauigkeit
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
          <div className="text-3xl font-black text-amber-400">{correct}/{total}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Zap size={10} />
            Richtig
          </div>
        </div>
      </div>

      {/* Answers review */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4">Antworten im Überblick</h3>
        <div className="flex flex-col gap-2">
          {questions.map((q, idx) => {
            const given = answers[idx];
            const correct = given === q.correct_index;
            const skipped = given === undefined;
            return (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl ${
                correct ? 'bg-emerald-500/10' : skipped ? 'bg-slate-700/50' : 'bg-red-500/10'
              }`}>
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  correct ? 'bg-emerald-500 text-white' : skipped ? 'bg-slate-600 text-slate-400' : 'bg-red-500 text-white'
                }`}>
                  {correct ? '✓' : skipped ? '–' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium leading-snug">{q.question}</p>
                  {!correct && !skipped && (
                    <p className="text-xs text-slate-400 mt-1">
                      Richtig: <span className="text-emerald-400">{q.answers[q.correct_index]}</span>
                    </p>
                  )}
                  {skipped && (
                    <p className="text-xs text-slate-500 mt-1">Nicht beantwortet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multiplayer scoreboard */}
      {players.length > 1 && (
        <div>
          <h3 className="font-bold text-white mb-4">Rangliste</h3>
          <Scoreboard players={players} currentUserId={currentUserId} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onPlayAgain && (
          <Button variant="primary" onClick={onPlayAgain} fullWidth>
            <RotateCcw size={18} />
            Nochmal spielen
          </Button>
        )}
        <Link to="/" className="flex-1">
          <Button variant="secondary" fullWidth>
            <Home size={18} />
            Startseite
          </Button>
        </Link>
      </div>
    </div>
  );
}
