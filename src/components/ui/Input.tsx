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
        <label className="text-sm font-medium text-nexus-muted">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={clsx(
            'bg-nexus-bg border border-nexus-border rounded-lg px-4 py-3 text-white placeholder-nexus-muted',
            'focus:outline-none focus:border-nexus-primary focus:ring-2 focus:ring-nexus-primary/20 focus:shadow-[0_0_10px_rgba(46,91,255,0.15)]',
            'transition-all duration-300 ease-in-out w-full',
            icon && 'pl-10',
            error && 'border-nexus-danger focus:border-nexus-danger focus:ring-nexus-danger/20',
            className
          )}
        />
      </div>
      {error && <p className="text-sm text-nexus-danger">{error}</p>}
    </div>
  );
}
