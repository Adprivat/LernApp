import React from 'react';
import questionsData from '@/data/questions.json';
import { clsx } from 'clsx';

interface CategorySelectorProps {
  selected: string;
  onChange: (category: string) => void;
}

export function CategorySelector({ selected, onChange }: CategorySelectorProps) {
  const categories = Object.entries((questionsData as any).categories);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {categories.map(([key, cat]: [string, any]) => (
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
          <span className="text-3xl">{cat.icon}</span>
          <span className="text-sm font-semibold text-center leading-tight">{cat.name}</span>
          <span className="text-xs text-nexus-muted">{cat.questions.length} Fragen</span>
        </button>
      ))}
    </div>
  );
}
