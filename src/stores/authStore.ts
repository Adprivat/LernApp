import { create } from 'zustand';
import { supabase, usernameToHashedEmail, usernameToEmail } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const email = usernameToEmail(username);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await get().fetchProfile();
    } finally {
      set({ loading: false });
    }
  },

  register: async (username: string, password: string) => {
    set({ loading: true });
    try {
      // Check username availability
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) throw new Error('Benutzername bereits vergeben');

      const email = await usernameToHashedEmail(username);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Registrierung fehlgeschlagen');

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        total_score: 0,
        games_played: 0,
        games_won: 0,
        current_streak: 0,
        best_streak: 0,
        is_admin: false,
        is_online: true,
      });
      if (profileError) throw profileError;

      await get().fetchProfile();
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    const { user } = get();
    if (user) {
      await supabase.from('profiles').update({ is_online: false }).eq('id', user.id);
    }
    await supabase.auth.signOut();
    set({ user: null });
  },

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ user: null, initialized: true });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      // Mark online
      await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', user.id);
      set({ user: { ...profile, is_online: true }, initialized: true });
    } else {
      set({ initialized: true });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (data) set({ user: data as Profile });
  },
}));
