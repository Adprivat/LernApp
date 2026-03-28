import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, User, Lock, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register, loading } = useAuthStore();
  const navigate = useNavigate();

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
    } catch (err: any) {
      const msg = err?.message || 'Fehler aufgetreten';
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-600/40 mb-4">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">LernApp</h1>
          <p className="text-slate-400 mt-2">Die kompetitive Lernplattform</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-slate-700/50 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isLogin ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isLogin ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'
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
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
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
            <p className="text-center text-xs text-slate-500 mt-4">
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
            <div key={label} className="text-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
