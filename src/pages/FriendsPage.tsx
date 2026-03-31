import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, UserMinus, Check, X, Zap, Clock, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/errorHandler';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import type { Friendship, Profile } from '@/types';
import { useNavigate } from 'react-router-dom';

export function FriendsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchFriendships = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select('*, user:profiles!user_id(id,username,is_online,avatar_url), friend:profiles!friend_id(id,username,is_online,avatar_url)')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    setFriendships(data || []);
  };

  useEffect(() => {
    fetchFriendships();
    channelRef.current = supabase
      .channel('friendships_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, fetchFriendships)
      .subscribe();
    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    };
  }, [user]);

  const sendRequest = async () => {
    if (!user || !searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchSuccess('');
    try {
      const { data: target, error: targetError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', searchQuery.trim())
        .single();
      if (targetError || !target) throw new Error(`Spieler "${searchQuery}" nicht gefunden`);
      if (target.id === user.id) throw new Error('Du kannst dir selbst keine Anfrage senden');

      // Check for existing friendship
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) {
        if (existing.status === 'accepted') throw new Error('Bereits befreundet');
        if (existing.status === 'pending') throw new Error('Anfrage bereits gesendet');
      }

      const { error } = await supabase.from('friendships').insert({ user_id: user.id, friend_id: target.id, status: 'pending' });
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: target.id,
        type: 'game_invite',
        title: 'Freundschaftsanfrage',
        message: `${user.username} möchte dein Freund sein!`,
        data: { friendship_type: 'request', from_id: user.id },
        is_read: false,
      });

      setSearchSuccess(`Anfrage an ${target.username} gesendet!`);
      setSearchQuery('');
      fetchFriendships();
    } catch (err) {
      setSearchError(getErrorMessage(err));
    } finally {
      setSearchLoading(false);
    }
  };

  const acceptRequest = async (id: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    fetchFriendships();
  };

  const declineRequest = async (id: string) => {
    await supabase.from('friendships').update({ status: 'declined' }).eq('id', id);
    fetchFriendships();
  };

  const removeFriend = async (id: string) => {
    await supabase.from('friendships').delete().eq('id', id);
    fetchFriendships();
  };

  const getOther = (f: Friendship): Profile | undefined =>
    f.user_id === user?.id ? (f.friend as Profile) : (f.user as Profile);

  const incoming = friendships.filter(f => f.friend_id === user?.id && f.status === 'pending');
  const accepted = friendships.filter(f => f.status === 'accepted');
  const sent = friendships.filter(f => f.user_id === user?.id && f.status === 'pending');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Users className="text-blue-400" size={32} />
            Freunde
          </h1>
          <p className="text-nexus-muted mt-1">Lade Freunde zu Spielen ein</p>
        </div>
        <button onClick={fetchFriendships} className="p-2 rounded-xl text-nexus-muted hover:text-white hover:bg-nexus-surface/60 border border-transparent hover:border-nexus-border cursor-pointer transition-all duration-300">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Send request */}
      <Card className="mb-6">
        <h2 className="font-bold text-white mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-blue-400" />
          Freund hinzufügen
        </h2>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Benutzername eingeben..."
            fullWidth
            onKeyDown={e => e.key === 'Enter' && sendRequest()}
          />
          <Button variant="primary" onClick={sendRequest} loading={searchLoading}>
            Anfrage senden
          </Button>
        </div>
        {searchError && <p className="text-sm text-red-400 mt-2">{searchError}</p>}
        {searchSuccess && <p className="text-sm text-emerald-400 mt-2">{searchSuccess}</p>}
      </Card>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <UserPlus size={16} className="text-amber-400" />
            Anfragen
            <Badge variant="warning" size="sm">{incoming.length}</Badge>
          </h2>
          <div className="flex flex-col gap-2">
            {incoming.map(f => {
              const other = getOther(f);
              return (
                <Card key={f.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <Avatar username={other?.username || '?'} size="sm" isOnline={other?.is_online} avatarUrl={other?.avatar_url} />
                    <span className="font-semibold text-white flex-1">{other?.username}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => acceptRequest(f.id)}>
                        <Check size={14} /> Annehmen
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => declineRequest(f.id)}>
                        <X size={14} /> Ablehnen
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="mb-6">
        <h2 className="font-bold text-white mb-3 flex items-center gap-2">
          <Users size={16} className="text-blue-400" />
          Freunde ({accepted.length})
        </h2>
        {accepted.length === 0 ? (
          <Card className="text-center py-8 text-nexus-muted">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Noch keine Freunde</p>
            <p className="text-xs mt-1">Sende jemandem eine Anfrage!</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {accepted.map(f => {
              const other = getOther(f);
              return (
                <Card key={f.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <Avatar username={other?.username || '?'} size="sm" isOnline={other?.is_online} avatarUrl={other?.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{other?.username}</p>
                      <p className="text-xs text-nexus-muted">{other?.is_online ? 'Online' : 'Offline'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate('/challenge')}
                        title="Herausfordern"
                      >
                        <Zap size={14} />
                        Herausfordern
                      </Button>
                      <button
                        onClick={() => removeFriend(f.id)}
                        className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 transition-all duration-300 cursor-pointer"
                        title="Freund entfernen"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Sent requests */}
      {sent.length > 0 && (
        <div>
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <Clock size={16} className="text-nexus-muted" />
            Gesendete Anfragen ({sent.length})
          </h2>
          <div className="flex flex-col gap-2">
            {sent.map(f => {
              const other = getOther(f);
              return (
                <Card key={f.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <Avatar username={other?.username || '?'} size="sm" avatarUrl={other?.avatar_url} />
                    <span className="font-semibold text-white flex-1">{other?.username}</span>
                    <Badge variant="warning" size="sm">Ausstehend</Badge>
                    <button
                      onClick={() => removeFriend(f.id)}
                      className="p-2 rounded-xl text-nexus-muted hover:text-nexus-danger hover:bg-nexus-danger/10 transition-all duration-300 cursor-pointer"
                      title="Anfrage zurückziehen"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
