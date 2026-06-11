'use client';

import { useEffect, useRef, useState } from 'react';
import { useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import type { ChatSession, Message } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages, scrollToBottom]);

  const startNewChat = () => {
    setSession(null);
    setInput('');
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const optimisticMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setSession((prev) => {
      if (!prev) return null;
      return { ...prev, messages: [...prev.messages, optimisticMsg] };
    });
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendMessage(text, session?._id);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.message,
        sources: res.sources,
        timestamp: new Date().toISOString(),
      };

      if (!session) {
        const full = await api.getChatSession(res.sessionId);
        setSession(full.session);
      } else {
        setSession((prev) =>
          prev ? { ...prev, messages: [...prev.messages, assistantMsg] } : null,
        );
      }
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const messages = session?.messages ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="Chat" />
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={startNewChat}>
            <Plus className="h-4 w-4 mr-1" /> New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 rounded-xl border bg-white p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16 text-gray-400">
              <MessageSquare className="h-12 w-12 opacity-30" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Ask anything about your uploaded documents.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-900 rounded-tl-sm',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1">
                        <span className="text-xs text-gray-500">Sources:</span>
                        {msg.sources.map((s, si) => (
                          <Badge key={si} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            placeholder="Ask a question about your documents… (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none flex-1"
            disabled={loading}
          />
          <Button
            onClick={() => void sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 self-end"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
