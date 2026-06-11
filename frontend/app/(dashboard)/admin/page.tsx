'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { User, AdminStats, ApiDocument } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Users, FileText, HardDrive, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    Promise.all([api.getAdminStats(), api.getAdminUsers(), api.getAdminDocuments()])
      .then(([s, u, d]) => {
        setStats(s);
        setUsers(u.users);
        setDocs(d.documents);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, router]);

  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast({ title: 'User deleted' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Delete failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Admin" />
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Admin Panel" />
      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Users', value: stats.users, icon: Users },
              { label: 'Documents', value: stats.documents, icon: FileText },
              { label: 'Chat Sessions', value: stats.chatSessions, icon: MessageSquare },
              { label: 'Storage', value: formatBytes(stats.storageBytes), icon: HardDrive },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
                  <Icon className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3 mt-4">
            {users.map((u) => (
              <Card key={u._id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{u.name}</p>
                    <p className="text-sm text-gray-400 truncate">{u.email}</p>
                  </div>
                  <Badge className={u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : ''}>
                    {u.role}
                  </Badge>
                  <p className="text-xs text-gray-400 hidden sm:block">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                  {u._id !== user?._id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500 shrink-0"
                      onClick={() => void handleDeleteUser(u._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="documents" className="space-y-3 mt-4">
            {docs.map((doc) => (
              <Card key={doc._id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.originalName}</p>
                    <div className="text-xs text-gray-400 flex gap-2 mt-1">
                      <span>{formatBytes(doc.size)}</span>
                      {doc.userId && typeof doc.userId === 'object' && (
                        <span>by {(doc.userId as User).email}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={
                      doc.status === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : doc.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }
                  >
                    {doc.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
