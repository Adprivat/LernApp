import React from 'react';
import questionsData from '@/data/questions.json';
import { clsx } from 'clsx';

interface CategorySelectorProps {
  selected: string;
  onChange: (category: string) => void;
}

const data = questionsData as any;
const subjects = data.subjects || {};
const allQuestions = Object.values(data.categories).flatMap((c: any) => c.questions);

function countByTag(tag: string): number {
  return allQuestions.filter((q: any) => q.tags?.includes(tag)).length;
}

export function CategorySelector({ selected, onChange }: CategorySelectorProps) {
  const subjectEntries = Object.entries(subjects) as [string, any][];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {/* "Alle Fragen" option */}
      <button
        onClick={() => onChange('exam_prep')}
        className={clsx(
          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer',
          selected === 'exam_prep'
            ? 'border-nexus-primary bg-nexus-primary/20 text-white shadow-[0_0_15px_rgba(46,91,255,0.2)] scale-[1.02]'
            : 'border-nexus-border bg-nexus-surface/40 text-nexus-text hover:border-nexus-accent/30 hover:bg-nexus-surface hover:shadow-[0_0_10px_rgba(151,169,255,0.05)]'
        )}
      >
        <span className="text-3xl">📝</span>
        <span className="text-sm font-semibold text-center leading-tight">Alle Fragen</span>
        <span className="text-xs text-nexus-muted">{allQuestions.length} Fragen</span>
      </button>

      {/* Subject filters */}
      {subjectEntries.map(([key, sub]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={clsx(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer',
            selected === key
              ? 'border-nexus-primary bg-nexus-primary/20 text-white shadow-[0_0_15px_rgba(46,91,255,0.2)] scale-[1.02]'
              : 'border-nexus-border bg-nexus-surface/40 text-nexus-text hover:border-nexus-accent/30 hover:bg-nexus-surface hover:shadow-[0_0_10px_rgba(151,169,255,0.05)]'
          )}
        >
          <span className="text-3xl">{sub.icon}</span>
          <span className="text-sm font-semibold text-center leading-tight">{sub.name}</span>
          <span className="text-xs text-nexus-muted">{countByTag(key)} Fragen</span>
        </button>
      ))}
    </div>
  );
}
