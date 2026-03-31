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
        'bg-nexus-surface text-nexus-muted border border-nexus-border': variant === 'default',
        'bg-nexus-success/15 text-nexus-success': variant === 'success',
        'bg-amber-500/15 text-amber-400': variant === 'warning',
        'bg-nexus-danger/15 text-nexus-danger': variant === 'danger',
        'bg-nexus-primary/15 text-nexus-accent': variant === 'info',
        'bg-purple-500/15 text-purple-400': variant === 'purple',
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
