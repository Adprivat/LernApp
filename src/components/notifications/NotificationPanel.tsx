import React, { useEffect } from 'react';
import { Bell, CheckCheck, Zap, Trophy, Star, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface NotificationPanelProps {
  onClose: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  challenge_received: <Zap size={16} className="text-amber-400" />,
  challenge_accepted: <CheckCheck size={16} className="text-emerald-400" />,
  challenge_declined: <Zap size={16} className="text-red-400" />,
  tournament_start: <Trophy size={16} className="text-yellow-400" />,
  achievement_earned: <Star size={16} className="text-purple-400" />,
  game_invite: <Users size={16} className="text-blue-400" />,
};

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { user } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) fetchNotifications(user.id);
  }, [user]);

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read) await markRead(notif.id);

    // Navigate based on notification type
    switch (notif.type) {
      case 'challenge_accepted':
        if (notif.data?.session_id) {
          navigate(`/game/${notif.data.session_id}`);
        } else {
          navigate('/challenge');
        }
        break;
      case 'challenge_received':
      case 'challenge_declined':
        navigate('/challenge');
        break;
      case 'tournament_created':
      case 'tournament_start':
      case 'tournament_end':
        navigate('/tournament');
        break;
      case 'game_invite':
        if (notif.data?.friendship_type === 'request') {
          navigate('/friends');
        } else if (notif.data?.session_id) {
          navigate(`/lobby/${notif.data.session_id}`);
        } else {
          navigate('/groups');
        }
        break;
      case 'achievement_earned':
        navigate('/profile');
        break;
      default:
        if (notif.data?.session_id) {
          navigate(`/game/${notif.data.session_id}`);
        }
        break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute top-16 right-4 w-96 max-h-[80vh] flex flex-col bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg shadow-2xl shadow-nexus-primary/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-nexus-border">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-nexus-muted" />
            <h3 className="font-bold text-white">Benachrichtigungen</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={() => user && markAllRead(user.id)}>
              Alle lesen
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-nexus-muted">
              <Bell size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Keine Benachrichtigungen</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={`flex gap-3 px-5 py-4 cursor-pointer transition-all duration-300 hover:bg-nexus-bg/50 border-b border-nexus-border last:border-0 ${
                  !notif.is_read ? 'bg-nexus-primary/5' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                    {typeIcons[notif.type] || <Bell size={16} className="text-nexus-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!notif.is_read ? 'text-white' : 'text-nexus-text'}`}>
                    {notif.title}
                  </p>
                    <p className="text-xs text-nexus-muted mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-nexus-muted/60 mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: de })}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 bg-nexus-primary rounded-full flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
