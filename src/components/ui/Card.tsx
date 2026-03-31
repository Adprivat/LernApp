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
        'bg-nexus-surface/70 border border-nexus-border rounded-lg backdrop-blur-sm',
        {
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
          '': padding === 'none',
        },
        hover && 'cursor-pointer hover:border-nexus-accent/30 hover:shadow-[0_0_15px_rgba(151,169,255,0.15)] transition-all duration-300 ease-in-out hover:scale-[1.02]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
