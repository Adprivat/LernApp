import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Question } from '@/types';
import { clsx } from 'clsx';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (index: number, timeTaken: number) => void;
  timeLeft: number;
  onTimeUp: () => void;
  revealed?: boolean;
  selectedAnswer?: number;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  timeLeft,
  onTimeUp,
  revealed = false,
  selectedAnswer,
}: QuestionCardProps) {
  const [startTime] = useState(() => Date.now());
  const [localSelected, setLocalSelected] = useState<number | null>(null);
  const [localRevealed, setLocalRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localTime, setLocalTime] = useState(timeLeft);
  const [timesUp, setTimesUp] = useState(false);

  useEffect(() => {
    setLocalSelected(null);
    setLocalRevealed(false);
    setLocalTime(timeLeft);
    setTimesUp(false);

    timerRef.current = setInterval(() => {
      setLocalTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimesUp(true);
          setLocalRevealed(true);
          onTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [question.id]);

  const handleSelect = (index: number) => {
    if (localSelected !== null || localRevealed) return;
    clearInterval(timerRef.current!);
    const timeTaken = Date.now() - startTime;
    setLocalSelected(index);
    setLocalRevealed(true);
    onAnswer(index, timeTaken);
  };

  const isCorrect = (index: number) => index === question.correct_index;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (localTime / 20) * circumference;
  const isLowTime = localTime <= 5;

  const answerLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-400">Frage</span>
          <h2 className="text-2xl font-bold text-white">
            {questionNumber} <span className="text-slate-500">/ {totalQuestions}</span>
          </h2>
        </div>

        {/* Circular timer */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={isLowTime ? '#ef4444' : '#6366f1'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-1000"
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${isLowTime ? 'text-red-400' : 'text-white'}`}>
            {localTime}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Category badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-slate-700 rounded-full text-xs font-medium text-slate-300 capitalize">
          {question.category}
        </span>
        <span className={clsx(
          'px-2 py-0.5 rounded-full text-xs font-semibold',
          question.difficulty === 'easy' && 'bg-emerald-500/20 text-emerald-400',
          question.difficulty === 'medium' && 'bg-amber-500/20 text-amber-400',
          question.difficulty === 'hard' && 'bg-red-500/20 text-red-400',
        )}>
          {question.difficulty === 'easy' ? 'Leicht' : question.difficulty === 'medium' ? 'Mittel' : 'Schwer'}
        </span>
      </div>

      {/* Question */}
      <div className="bg-slate-700/40 rounded-2xl p-6 border border-slate-600/50">
        <p className="text-xl font-semibold text-white leading-relaxed">{question.question}</p>
      </div>

      {/* Answers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.answers.map((answer, index) => {
          const isSelected = localSelected === index || selectedAnswer === index;
          const showResult = localRevealed || revealed;
          const correct = isCorrect(index);

          let buttonClass = 'bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500';

          if (showResult) {
            if (correct) {
              buttonClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
            } else if (isSelected && !correct) {
              buttonClass = 'bg-red-500/20 border-red-500 text-red-300 animate-shake';
            } else {
              buttonClass = 'bg-slate-800/50 border-slate-700 text-slate-500';
            }
          } else if (isSelected) {
            buttonClass = 'bg-indigo-600/30 border-indigo-500 text-indigo-200';
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={localSelected !== null || localRevealed}
              className={clsx(
                'flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left font-medium',
                'disabled:cursor-not-allowed',
                buttonClass
              )}
            >
              <span className={clsx(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                showResult && correct ? 'bg-emerald-500 text-white' :
                showResult && isSelected && !correct ? 'bg-red-500 text-white' :
                'bg-slate-600 text-slate-300'
              )}>
                {showResult && correct ? <CheckCircle size={16} /> :
                 showResult && isSelected && !correct ? <XCircle size={16} /> :
                 answerLabels[index]}
              </span>
              <span className="flex-1 leading-snug">{answer}</span>
            </button>
          );
        })}
      </div>

      {timesUp && !localSelected && (
        <div className="text-center py-2 px-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 font-medium">
          Zeit abgelaufen! Die richtige Antwort war: {question.answers[question.correct_index]}
        </div>
      )}
    </div>
  );
}
