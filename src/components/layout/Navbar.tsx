import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Home, LogOut, Menu, Trophy, Users, X, ShieldCheck, User, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

const navItems = [
  { path: '/', icon: Home, label: 'Startseite' },
  { path: '/learn', icon: BookOpen, label: 'Lernen' },
  { path: '/challenge', icon: Zap, label: 'Herausforderung' },
  { path: '/groups', icon: Users, label: 'Gruppen' },
  { path: '/tournament', icon: Trophy, label: 'Turnier' },
];

export function Navbar() {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <>
      <nav className="sticky top-0 z-40 bg-nexus-bg/95 backdrop-blur border-b border-nexus-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 font-bold text-xl text-white group">
              <div className="relative w-9 h-9 rounded-xl bg-nexus-surface/70 backdrop-blur-sm border border-nexus-primary/25 flex items-center justify-center overflow-hidden shadow-[0_0_16px_rgba(46,91,255,0.2)] group-hover:shadow-[0_0_24px_rgba(46,91,255,0.35)] group-hover:border-nexus-primary/50 transition-all duration-500">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-[linear-gradient(90deg,transparent,#2E5BFF,transparent)]" />
                {/* Corner glow */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-nexus-primary opacity-[0.15] blur-xl group-hover:opacity-[0.25] transition-opacity duration-500" />
                <BookOpen size={17} className="text-nexus-accent relative z-10 drop-shadow-[0_0_6px_rgba(151,169,255,0.4)]" />
              </div>
              <span className="bg-gradient-to-r from-white via-white to-nexus-accent bg-clip-text text-transparent tracking-tight">LernApp</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    location.pathname === path
                      ? 'bg-nexus-primary/15 text-nexus-accent shadow-[0_0_10px_rgba(151,169,255,0.1)]'
                      : 'text-nexus-muted hover:text-white hover:bg-nexus-surface'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
              {user.is_admin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/20'
                  }`}
                >
                  <ShieldCheck size={16} />
                  Admin
                </Link>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-nexus-muted hover:text-white hover:bg-nexus-surface/60 rounded-xl transition-all duration-300 border border-transparent hover:border-nexus-border cursor-pointer"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile */}
              <Link
                to="/profile"
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-nexus-surface/60 border border-transparent hover:border-nexus-border transition-all duration-300"
              >
                <Avatar username={user.username} size="sm" isOnline />
                <span className="hidden sm:block text-sm font-medium text-white">{user.username}</span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="hidden md:flex p-2 text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 rounded-xl transition-all duration-300 border border-transparent hover:border-nexus-danger/20 cursor-pointer"
                title="Abmelden"
              >
                <LogOut size={18} />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-nexus-muted hover:text-white hover:bg-nexus-surface/60 rounded-xl border border-transparent hover:border-nexus-border cursor-pointer"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-nexus-border bg-nexus-bg px-4 py-3 flex flex-col gap-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  location.pathname === path
                    ? 'bg-nexus-primary/15 text-nexus-accent'
                    : 'text-nexus-muted hover:text-white hover:bg-nexus-surface'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {user.is_admin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-amber-900/20"
              >
                <ShieldCheck size={18} />
                Admin-Panel
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-nexus-danger hover:bg-nexus-danger/10 text-left mt-2 border-t border-nexus-border pt-3 cursor-pointer transition-all duration-300"
            >
              <LogOut size={18} />
              Abmelden
            </button>
          </div>
        )}
      </nav>

      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </>
  );
}
