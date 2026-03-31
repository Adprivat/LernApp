import React from 'react';
import { Trophy, Star, Target, Zap } from 'lucide-react';
import type { GamePlayer } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';

interface ScoreboardProps {
  players: GamePlayer[];
  currentUserId?: string;
}

export function Scoreboard({ players, currentUserId }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
  const rankBg = ['bg-yellow-500/10 border-yellow-500/30', 'bg-slate-500/10 border-slate-500/30', 'bg-amber-600/10 border-amber-600/30'];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((player, idx) => {
        const isMe = player.user_id === currentUserId;
        const total = player.correct_answers + player.wrong_answers;
        const accuracy = total > 0 ? Math.round((player.correct_answers / total) * 100) : 0;

        return (
          <div
            key={player.id}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${
              isMe
                ? 'bg-nexus-primary/10 border-nexus-primary/40 ring-1 ring-nexus-primary/20'
                : idx < 3
                ? rankBg[idx]
                : 'bg-nexus-surface/50 border-nexus-border'
            }`}
          >
            {/* Rank */}
            <div className={`text-2xl font-black w-8 text-center ${idx < 3 ? rankColors[idx] : 'text-slate-500'}`}>
              {idx < 3 ? medals[idx] : `#${idx + 1}`}
            </div>

            {/* Avatar */}
            <Avatar
              username={player.profile?.username || 'Unbekannt'}
              size="md"
              isOnline={player.profile?.is_online}
            />

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-bold truncate ${isMe ? 'text-nexus-accent' : 'text-white'}`}>
                  {player.profile?.username || 'Unbekannt'}
                </span>
                {isMe && <span className="text-xs text-nexus-accent bg-nexus-accent/10 px-1.5 py-0.5 rounded-full">Du</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-nexus-muted">
                <span className="flex items-center gap-1">
                  <Target size={10} />
                  {accuracy}% Treffer
                </span>
                <span className="flex items-center gap-1">
                  <Star size={10} />
                  {player.correct_answers} richtig
                </span>
              </div>
            </div>

            {/* Score */}
            <div className="text-right">
              <div className={`text-xl font-black ${idx === 0 ? 'text-yellow-400' : isMe ? 'text-nexus-accent' : 'text-white'}`}>
                {player.score.toLocaleString()}
              </div>
              <div className="text-xs text-nexus-muted">Punkte</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
