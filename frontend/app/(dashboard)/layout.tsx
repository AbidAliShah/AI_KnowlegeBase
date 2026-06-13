'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-offwhite-200">
        <Loader2 className="h-8 w-8 animate-spin text-charcoal-700" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-offwhite-200 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto flex flex-col">{children}</main>
      </div>
    </SidebarProvider>
  );
}
