import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
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
import { FriendsPage } from '@/pages/FriendsPage';
import { ImpressumPage } from '@/pages/ImpressumPage';
import { DatenschutzPage } from '@/pages/DatenschutzPage';
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

function playNotificationSound(type?: string) {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;

    switch (type) {
      case 'challenge_received': {
        // Urgent double-ping (ascending) — someone wants to battle
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g1 = ctx.createGain();
        const g2 = ctx.createGain();
        osc1.connect(g1); g1.connect(ctx.destination);
        osc2.connect(g2); g2.connect(ctx.destination);
        osc1.frequency.setValueAtTime(660, t);
        g1.gain.setValueAtTime(0.3, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc1.start(t); osc1.stop(t + 0.15);
        osc2.frequency.setValueAtTime(880, t + 0.18);
        g2.gain.setValueAtTime(0.001, t);
        g2.gain.setValueAtTime(0.3, t + 0.18);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc2.start(t + 0.18); osc2.stop(t + 0.35);
        break;
      }
      case 'challenge_accepted': {
        // Triumphant rising triad — game on!
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, t + i * 0.1);
          g.gain.setValueAtTime(0.001, t);
          g.gain.setValueAtTime(0.25, t + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
          osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.2);
        });
        break;
      }
      case 'challenge_declined': {
        // Soft descending tone — declined
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(280, t + 0.3);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
        break;
      }
      case 'achievement_earned': {
        // Fanfare — celebratory ascending arpeggio
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + i * 0.12);
          g.gain.setValueAtTime(0.001, t);
          g.gain.setValueAtTime(0.3, t + i * 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.25);
          osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.25);
        });
        break;
      }
      case 'tournament_start': {
        // Horn-like announcement — tournament begins
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(392, t);
        osc.frequency.setValueAtTime(523, t + 0.15);
        osc.frequency.setValueAtTime(659, t + 0.3);
        g.gain.setValueAtTime(0.15, t);
        g.gain.setValueAtTime(0.2, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
        break;
      }
      case 'tournament_end': {
        // Resolved chord — tournament finished
        [523, 659, 784].forEach((freq) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.15, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.start(t); osc.stop(t + 0.5);
        });
        break;
      }
      case 'tournament_created': {
        // Quick attention chime — new tournament
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.setValueAtTime(784, t);
        osc.frequency.setValueAtTime(1047, t + 0.1);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t); osc.stop(t + 0.25);
        break;
      }
      case 'game_invite': {
        // Friendly double-boop — someone invites you
        [587, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.15);
          g.gain.setValueAtTime(0.001, t);
          g.gain.setValueAtTime(0.25, t + i * 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.12);
          osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.12);
        });
        break;
      }
      default: {
        // Generic ping fallback
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(660, t + 0.15);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
      }
    }
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
        playNotificationSound(notif.type);
        // Auto-navigate challenger when their challenge is accepted
        if (notif.type === 'challenge_accepted' && notif.data?.session_id) {
          navigate(`/game/${notif.data.session_id}`);
        }
        // Auto-navigate tournament participants when tournament starts
        if (notif.type === 'tournament_start' && notif.data?.session_id) {
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
          <Route path="/friends" element={<RequireAuth><FriendsPage /></RequireAuth>} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/datenschutz" element={<DatenschutzPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="py-4 text-center text-xs text-nexus-muted border-t border-nexus-border/30">
        <div className="flex justify-center gap-3">
          <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
          <span>·</span>
          <Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
        </div>
      </footer>
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
