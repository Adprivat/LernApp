import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'group/btn relative inline-flex items-center justify-center gap-2 font-bold rounded-xl cursor-pointer',
        'transition-all duration-300 ease-out',
        'active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        {
          // Primary — glass surface with blue accent
          'bg-nexus-surface/70 text-white border border-nexus-border hover:border-[#2E5BFF]/40 hover:shadow-[0_0_20px_rgba(46,91,255,0.15)] hover:bg-nexus-surface/90 backdrop-blur-sm':
            variant === 'primary',
          // Secondary — glass surface with border glow
          'bg-nexus-surface/70 text-nexus-text border border-nexus-border hover:border-nexus-accent/30 hover:bg-nexus-surface/90 hover:text-white hover:shadow-[0_0_15px_rgba(151,169,255,0.1)] backdrop-blur-sm':
            variant === 'secondary',
          // Danger — glass surface with red accent
          'bg-nexus-surface/70 text-red-300 border border-nexus-border hover:border-[#FF3D00]/40 hover:shadow-[0_0_20px_rgba(255,61,0,0.12)] hover:bg-nexus-surface/90 hover:text-red-200 backdrop-blur-sm':
            variant === 'danger',
          // Ghost — minimal with subtle hover reveal
          'bg-transparent text-nexus-muted hover:text-white hover:bg-nexus-surface/60 border border-transparent hover:border-nexus-border':
            variant === 'ghost',
          // Success — glass surface with green accent
          'bg-nexus-surface/70 text-emerald-300 border border-nexus-border hover:border-[#00C853]/40 hover:shadow-[0_0_20px_rgba(0,200,83,0.12)] hover:bg-nexus-surface/90 hover:text-emerald-200 backdrop-blur-sm':
            variant === 'success',
        },
        {
          'px-3.5 py-1.5 text-sm rounded-lg': size === 'sm',
          'px-5 py-2.5 text-sm': size === 'md',
          'px-7 py-3.5 text-base tracking-wide': size === 'lg',
        },
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
