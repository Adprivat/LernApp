import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, User, Lock, LogIn, UserPlus, AlertTriangle, Megaphone } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { getErrorMessage } from '@/lib/errorHandler';
import type { Announcement } from '@/types';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { login, register, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setAnnouncements(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Bitte alle Felder ausfüllen');
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('Passwörter stimmen nicht überein');
        return;
      }
      if (password.length < 6) {
        setError('Passwort muss mindestens 6 Zeichen lang sein');
        return;
      }
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
        setError('Benutzername: 3-20 Zeichen, nur Buchstaben, Zahlen, _ oder -');
        return;
      }
    }

    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      navigate('/');
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg.includes('Invalid login credentials')) {
        setError('Falscher Benutzername oder Passwort');
      } else if (msg.includes('already registered')) {
        setError('Benutzername bereits vergeben');
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-16 h-16 bg-nexus-surface/80 backdrop-blur-sm rounded-2xl mb-4 border border-[#2E5BFF]/25 shadow-[0_0_24px_rgba(46,91,255,0.2)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent,#2E5BFF,transparent)]" />
            <div className="absolute -top-5 -right-5 w-12 h-12 rounded-full bg-[#2E5BFF] opacity-[0.15] blur-xl" />
            <BookOpen size={30} className="text-nexus-accent relative z-10 drop-shadow-[0_0_8px_rgba(151,169,255,0.4)]" />
          </div>
          <h1 className="text-3xl font-black text-white">LernApp</h1>
          <p className="text-nexus-muted mt-2">Die kompetitive Lernplattform</p>
        </div>

        {/* Beta Warning */}
        <div className="mb-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 backdrop-blur-sm">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold text-amber-400">Beta-Version</span>
            <p className="text-amber-200/70 mt-0.5">Diese App befindet sich in aktiver Entwicklung. Es können Fehler auftreten und Daten verloren gehen.</p>
          </div>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-6 flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {announcements.map(ann => {
              const catStyles: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'danger' }> = {
                feature: { label: 'Feature', variant: 'success' },
                bugfix: { label: 'Bugfix', variant: 'danger' },
                wartung: { label: 'Wartung', variant: 'warning' },
                info: { label: 'Info', variant: 'info' },
              };
              const cat = catStyles[ann.category] || catStyles.info;
              return (
                <div key={ann.id} className="flex items-start gap-3 bg-nexus-surface/50 border border-nexus-border rounded-xl px-4 py-3 backdrop-blur-sm">
                  <Megaphone size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{ann.title}</span>
                      <Badge variant={cat.variant} size="sm">{cat.label}</Badge>
                    </div>
                    <p className="text-xs text-nexus-muted mt-0.5">{ann.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg shadow-2xl shadow-nexus-primary/5 p-8">
          {/* Tabs */}
          <div className="flex bg-nexus-bg/60 rounded-xl p-1 mb-6 border border-nexus-border">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 cursor-pointer ${
                isLogin
                  ? 'bg-nexus-surface/90 text-white border border-[#2E5BFF]/30 shadow-[0_0_15px_rgba(46,91,255,0.1)]'
                  : 'text-nexus-muted hover:text-white border border-transparent'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 cursor-pointer ${
                !isLogin
                  ? 'bg-nexus-surface/90 text-white border border-[#2E5BFF]/30 shadow-[0_0_15px_rgba(46,91,255,0.1)]'
                  : 'text-nexus-muted hover:text-white border border-transparent'
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Benutzername"
              icon={<User size={16} />}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="MeinName123"
              autoComplete="username"
              autoFocus
            />
            <Input
              label="Passwort"
              type="password"
              icon={<Lock size={16} />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {!isLogin && (
              <Input
                label="Passwort bestätigen"
                type="password"
                icon={<Lock size={16} />}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            )}

            {error && (
              <div className="bg-nexus-danger/10 border border-nexus-danger/30 rounded-lg px-4 py-3 text-sm text-nexus-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}
              className="mt-2"
            >
              {isLogin ? (
                <><LogIn size={20} />Anmelden</>
              ) : (
                <><UserPlus size={20} />Konto erstellen</>
              )}
            </Button>
          </form>

          {!isLogin && (
            <p className="text-center text-xs text-nexus-muted mt-4">
              Kein E-Mail erforderlich — nur Benutzername & Passwort
            </p>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: '⚔️', label: 'Herausforderungen' },
            { icon: '🏆', label: 'Turniere' },
            { icon: '📊', label: 'Ranglisten' },
          ].map(({ icon, label }) => (
            <div key={label} className="text-center p-3 bg-nexus-surface/50 rounded-lg border border-nexus-border">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs text-nexus-muted">{label}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
