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
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20': variant === 'primary',
          'bg-slate-700 hover:bg-slate-600 text-white': variant === 'secondary',
          'bg-red-600 hover:bg-red-500 text-white': variant === 'danger',
          'bg-transparent hover:bg-slate-700/50 text-slate-300 hover:text-white': variant === 'ghost',
          'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20': variant === 'success',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-5 py-2.5 text-base': size === 'md',
          'px-7 py-3.5 text-lg': size === 'lg',
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
