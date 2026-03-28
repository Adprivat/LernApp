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
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
            selected === key
              ? 'border-indigo-500 bg-indigo-600/20 text-white'
              : 'border-slate-600 bg-slate-700/40 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
          )}
        >
          <span className="text-3xl">{cat.icon}</span>
          <span className="text-sm font-semibold text-center leading-tight">{cat.name}</span>
          <span className="text-xs text-slate-400">{cat.questions.length} Fragen</span>
        </button>
      ))}
    </div>
  );
}
