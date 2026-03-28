import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center font-semibold rounded-full',
      {
        'bg-slate-700 text-slate-300': variant === 'default',
        'bg-emerald-500/20 text-emerald-400': variant === 'success',
        'bg-amber-500/20 text-amber-400': variant === 'warning',
        'bg-red-500/20 text-red-400': variant === 'danger',
        'bg-blue-500/20 text-blue-400': variant === 'info',
        'bg-purple-500/20 text-purple-400': variant === 'purple',
      },
      {
        'px-2 py-0.5 text-xs': size === 'sm',
        'px-3 py-1 text-sm': size === 'md',
      },
      className
    )}>
      {children}
    </span>
  );
}
