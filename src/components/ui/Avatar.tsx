import React from 'react';
import { clsx } from 'clsx';

interface AvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
  avatarUrl?: string;
}

const colors = [
  'bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-rose-600',
  'bg-orange-600', 'bg-amber-600', 'bg-emerald-600', 'bg-teal-600',
  'bg-cyan-600', 'bg-blue-600',
];

function getColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ username, size = 'md', isOnline, className, avatarUrl }: AvatarProps) {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const dotSize = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  return (
    <div className={clsx('relative inline-flex flex-shrink-0', className)}>
      <div className={clsx(
        'rounded-full flex items-center justify-center font-bold text-white uppercase overflow-hidden',
        sizeMap[size],
        avatarUrl ? '' : getColor(username)
      )}>
        {avatarUrl
          ? <img src={avatarUrl} className="w-full h-full object-cover" alt={username} />
          : username.slice(0, 2)
        }
      </div>
      {isOnline !== undefined && (
        <div className={clsx(
          'absolute bottom-0 right-0 rounded-full border-2 border-slate-800',
          dotSize[size],
          isOnline ? 'bg-emerald-500' : 'bg-slate-500'
        )} />
      )}
    </div>
  );
}
