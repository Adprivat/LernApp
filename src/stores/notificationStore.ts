import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (userId: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  addNotification: (n: Notification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const notifications = data || [];
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.is_read).length,
    });
  },

  markRead: async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async (userId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (n: Notification) => {
    set(state => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + (n.is_read ? 0 : 1),
    }));
  },
}));
