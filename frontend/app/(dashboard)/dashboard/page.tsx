'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { AdminStats } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, MessageSquare, Users, HardDrive, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.getAdminStats().then(setStats).catch(console.error);
    }
  }, [user]);

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-charcoal-700">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 mt-1">
            Upload documents and start chatting with your knowledge base.
          </p>
        </div>

        {/* Admin stats */}
        {user?.role === 'admin' && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.users, icon: Users, color: 'text-charcoal-700', bg: 'bg-offwhite-200' },
              { label: 'Documents', value: stats.documents, icon: FileText, color: 'text-charcoal-700', bg: 'bg-offwhite-200' },
              { label: 'Chat Sessions', value: stats.chatSessions, icon: MessageSquare, color: 'text-charcoal-700', bg: 'bg-offwhite-200' },
              { label: 'Storage Used', value: formatBytes(stats.storageBytes), icon: HardDrive, color: 'text-charcoal-700', bg: 'bg-offwhite-200' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
                  <div className={`p-2 rounded-md ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-charcoal-700">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-dashed border-2 hover:border-mustard-500 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="p-3 bg-offwhite-200 rounded-md">
                <FileText className="h-6 w-6 text-charcoal-700" />
              </div>
              <div>
                <p className="font-semibold text-charcoal-700">Upload Documents</p>
                <p className="text-sm text-gray-500 mt-1">Add PDFs to your knowledge base</p>
              </div>
              <Link href="/documents">
                <Button size="sm" className="bg-charcoal-700 hover:bg-charcoal-800 text-offwhite-100">Go to Documents</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 hover:border-mustard-500 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="p-3 bg-offwhite-200 rounded-md">
                <BrainCircuit className="h-6 w-6 text-mustard-500" />
              </div>
              <div>
                <p className="font-semibold text-charcoal-700">Start Chatting</p>
                <p className="text-sm text-gray-500 mt-1">Ask questions about your documents</p>
              </div>
              <Link href="/chat">
                <Button size="sm" className="bg-charcoal-700 hover:bg-charcoal-800 text-offwhite-100">New Chat</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 hover:border-mustard-500 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center gap-3">
              <div className="p-3 bg-offwhite-200 rounded-md">
                <MessageSquare className="h-6 w-6 text-charcoal-700" />
              </div>
              <div>
                <p className="font-semibold text-charcoal-700">Chat History</p>
                <p className="text-sm text-gray-500 mt-1">Continue previous conversations</p>
              </div>
              <Link href="/history">
                <Button size="sm" variant="outline">View History</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
