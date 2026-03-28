import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ChatMessage } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface GameChatProps {
  sessionId: string;
}

export function GameChat({ sessionId }: GameChatProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Load existing messages
    supabase
      .from('chat_messages')
      .select('*, profile:profiles(username, is_online)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages(data || []));

    // Subscribe to new messages
    channelRef.current = supabase
      .channel(`chat:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('chat_messages')
          .select('*, profile:profiles(username, is_online)')
          .eq('id', payload.new.id)
          .single();
        if (data) setMessages(prev => [...prev, data]);
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    const content = input.trim().slice(0, 200);
    setInput('');
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      content,
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden h-full">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 border-b border-slate-700 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <MessageCircle size={16} className="text-indigo-400" />
          Chat
          {messages.length > 0 && (
            <span className="bg-slate-600 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[200px] max-h-[300px]">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-8">
                Noch keine Nachrichten
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar username={msg.profile?.username || '?'} size="sm" />
                  <div className={`max-w-[75%] ${msg.user_id === user?.id ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {msg.user_id !== user?.id && (
                      <span className="text-xs text-slate-400 px-1">{msg.profile?.username}</span>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                      msg.user_id === user?.id
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-slate-700 text-white rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 border-t border-slate-700">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Nachricht..."
              maxLength={200}
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl transition-colors"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
