import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ children, className, onClick, hover, padding = 'md' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-slate-800 border border-slate-700 rounded-2xl',
        {
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
          '': padding === 'none',
        },
        hover && 'cursor-pointer hover:border-slate-600 hover:bg-slate-750 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
