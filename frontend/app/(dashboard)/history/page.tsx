'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import type { ChatSession } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HistoryPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getChatSessions()
      .then((d) => setSessions(d.sessions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      toast({ title: 'Deleted', description: 'Conversation removed.' });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Delete failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Chat History" />
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare className="h-12 w-12 mx-auto opacity-30 mb-3" />
            <p>No conversations yet.</p>
            <Button
              className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => router.push('/chat')}
            >
              Start your first chat
            </Button>
          </div>
        ) : (
          sessions.map((session) => (
            <Card key={session._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-3 sm:gap-4 py-4">
                <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{session.title}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>{session.messages.length} messages</span>
                    <span>{new Date(session.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-indigo-600 shrink-0"
                  onClick={() => router.push(`/chat?session=${session._id}`)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500 shrink-0"
                  onClick={() => void handleDelete(session._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
