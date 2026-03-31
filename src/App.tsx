import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
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
import { GuidePage } from '@/pages/GuidePage';
import { BeamsBackground } from '@/components/ui/BeamsBackground';

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

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // AudioContext blocked (e.g. no user interaction yet) — fail silently
  }
}

function AppLayout() {
  const { user, fetchProfile } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  const channelRef = useRef<RealtimeChannel | null>(null);
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
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
        const notif = payload.new as any;
        addNotification(notif);
        playNotificationSound();
        // Auto-navigate challenger when their challenge is accepted
        if (notif.type === 'challenge_accepted' && notif.data?.session_id) {
          navigate(`/game/${notif.data.session_id}`);
        }
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [user?.id]);

  return (
    <BeamsBackground intensity="subtle">
    <div className="min-h-screen flex flex-col">
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
          <Route path="/guide" element={<RequireAuth><GuidePage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
    </BeamsBackground>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
