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
  const hasTimer = timeLeft > 0;

  useEffect(() => {
    setLocalSelected(null);
    setLocalRevealed(false);
    setLocalTime(timeLeft);
    setTimesUp(false);

    if (!hasTimer) return;

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
  const progress = (localTime / timeLeft) * circumference;
  const isLowTime = localTime <= 5;

  const answerLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-nexus-muted">Frage</span>
          <h2 className="text-2xl font-bold text-white">
            {questionNumber} <span className="text-nexus-muted">/ {totalQuestions}</span>
          </h2>
        </div>

        {/* Circular timer */}
        {hasTimer ? (
        <div className="relative w-16 h-16 sm:w-24 sm:h-24">
          <svg className="w-16 h-16 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#091328" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={isLowTime ? '#FF3D00' : '#2E5BFF'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-1000"
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center text-lg sm:text-2xl font-bold ${isLowTime ? 'text-nexus-danger' : 'text-white'}`}>
            {localTime}
          </div>
        </div>
        ) : (
        <div className="relative w-16 h-16 sm:w-24 sm:h-24">
          <svg className="w-16 h-16 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#091328" strokeWidth="8" />
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#2E5BFF" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={0} opacity="0.3" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-lg sm:text-2xl font-bold text-nexus-accent">
            ∞
          </div>
        </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-nexus-surface rounded-full h-1.5">
        <div
          className="bg-nexus-primary h-1.5 rounded-full transition-all"
          style={{ width: `${((questionNumber - 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Category badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 bg-nexus-surface rounded-full text-xs font-medium text-nexus-muted capitalize">
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
      <div className="bg-nexus-surface/60 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-nexus-border">
        <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed break-words overflow-hidden">{question.question}</p>
      </div>

      {/* Answers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.answers.map((answer, index) => {
          const isSelected = localSelected === index || selectedAnswer === index;
          const showResult = localRevealed || revealed;
          const correct = isCorrect(index);

          let buttonClass = 'bg-nexus-surface/80 border-nexus-border text-white hover:bg-nexus-surface hover:border-nexus-accent/30 hover:shadow-[0_0_12px_rgba(151,169,255,0.08)]';

          if (showResult) {
            if (correct) {
              buttonClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(0,200,83,0.15)]';
            } else if (isSelected && !correct) {
              buttonClass = 'bg-red-500/20 border-red-500 text-red-300 animate-shake shadow-[0_0_15px_rgba(255,61,0,0.15)]';
            } else {
              buttonClass = 'bg-nexus-bg/50 border-nexus-border text-nexus-muted opacity-50';
            }
          } else if (isSelected) {
            buttonClass = 'bg-nexus-primary/30 border-nexus-primary text-nexus-accent shadow-[0_0_15px_rgba(46,91,255,0.2)]';
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={localSelected !== null || localRevealed}
              className={clsx(
                'flex items-center gap-3 px-5 py-4 rounded-xl border-2 transition-all duration-300 text-left font-medium cursor-pointer',
                'disabled:cursor-not-allowed',
                buttonClass
              )}
            >
              <span className={clsx(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                showResult && correct ? 'bg-emerald-500 text-white' :
                showResult && isSelected && !correct ? 'bg-red-500 text-white' :
                'bg-nexus-surface text-nexus-muted'
              )}>
                {showResult && correct ? <CheckCircle size={16} /> :
                 showResult && isSelected && !correct ? <XCircle size={16} /> :
                 answerLabels[index]}
              </span>
              <span className="flex-1 leading-snug break-words min-w-0">{answer}</span>
            </button>
          );
        })}
      </div>

      {timesUp && !localSelected && (
        <div className="text-center py-2 px-4 bg-nexus-danger/20 border border-nexus-danger/50 rounded-lg text-nexus-danger font-medium">
          Zeit abgelaufen! Die richtige Antwort war: {question.answers[question.correct_index]}
        </div>
      )}
    </div>
  );
}
