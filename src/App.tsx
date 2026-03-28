import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Navbar } from '@/components/layout/Navbar';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { LearnPage } from '@/pages/LearnPage';
import { ChallengePage } from '@/pages/ChallengePage';
import { GroupPage } from '@/pages/GroupPage';
import { LobbyPage } from '@/pages/LobbyPage';
import { GamePage } from '@/pages/GamePage';
import { TournamentPage } from '@/pages/TournamentPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { AdminPage } from '@/pages/AdminPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const { user, fetchProfile } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') fetchProfile();
      if (event === 'SIGNED_OUT') useAuthStore.setState({ user: null });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      channelRef.current?.unsubscribe();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    // Real-time notifications
    channelRef.current = supabase
      .channel(`user_notifs:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        addNotification(payload.new as any);
      })
      .subscribe();

    // Online heartbeat
    const updateOnline = () => {
      supabase.from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});
    };
    updateOnline();
    heartbeatRef.current = setInterval(updateOnline, 30000);

    return () => {
      channelRef.current?.unsubscribe();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/learn" element={<RequireAuth><LearnPage /></RequireAuth>} />
          <Route path="/challenge" element={<RequireAuth><ChallengePage /></RequireAuth>} />
          <Route path="/groups" element={<RequireAuth><GroupPage /></RequireAuth>} />
          <Route path="/lobby/:sessionId" element={<RequireAuth><LobbyPage /></RequireAuth>} />
          <Route path="/game/:sessionId" element={<RequireAuth><GamePage /></RequireAuth>} />
          <Route path="/tournament" element={<RequireAuth><TournamentPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
