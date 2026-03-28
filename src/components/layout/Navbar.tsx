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
      <nav className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              LernApp
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === path
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
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
                className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
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
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Avatar username={user.username} size="sm" isOnline />
                <span className="hidden sm:block text-sm font-medium text-white">{user.username}</span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="hidden md:flex p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                title="Abmelden"
              >
                <LogOut size={18} />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-900 px-4 py-3 flex flex-col gap-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === path
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 text-left mt-2 border-t border-slate-700 pt-3"
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
