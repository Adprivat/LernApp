import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({ label, error, icon, fullWidth, className, ...props }: InputProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={clsx(
            'bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400',
            'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
            'transition-all duration-200 w-full',
            icon && 'pl-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
