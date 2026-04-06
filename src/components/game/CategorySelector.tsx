import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import type { Subject } from '@/types';

interface CategorySelectorProps {
  selected: string;
  onChange: (category: string) => void;
}

export function CategorySelector({ selected, onChange }: CategorySelectorProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [subjectRes, countRes, tagsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('sort_order'),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('questions').select('tags').eq('is_active', true),
      ]);

      const counts: Record<string, number> = {};
      (tagsRes.data || []).forEach((q: any) => {
        (q.tags || []).forEach((t: string) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      });

      setSubjects(subjectRes.data || []);
      setTotalCount(countRes.count || 0);
      setTagCounts(counts);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-nexus-surface/40 border-2 border-nexus-border animate-pulse" />
        ))}
      </div>
    );
  }

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
        <span className="text-xs text-nexus-muted">{totalCount} Fragen</span>
      </button>

      {/* Subject filters */}
      {subjects.map((sub) => (
        <button
          key={sub.key}
          onClick={() => onChange(sub.key)}
          className={clsx(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer',
            selected === sub.key
              ? 'border-nexus-primary bg-nexus-primary/20 text-white shadow-[0_0_15px_rgba(46,91,255,0.2)] scale-[1.02]'
              : 'border-nexus-border bg-nexus-surface/40 text-nexus-text hover:border-nexus-accent/30 hover:bg-nexus-surface hover:shadow-[0_0_10px_rgba(151,169,255,0.05)]'
          )}
        >
          <span className="text-3xl">{sub.icon}</span>
          <span className="text-sm font-semibold text-center leading-tight">{sub.name}</span>
          <span className="text-xs text-nexus-muted">{tagCounts[sub.key] || 0} Fragen</span>
        </button>
      ))}
    </div>
  );
}
