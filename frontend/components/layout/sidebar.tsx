'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  History,
  Settings,
  ShieldCheck,
  LogOut,
  BrainCircuit,
  Users,
  Sparkles,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { WorkspaceSwitcher } from './workspace-switcher';
import { useSidebar } from './sidebar-context';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/actions', label: 'AI Actions', icon: Sparkles },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/history', label: 'History', icon: History },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-charcoal-700 text-offwhite-100 px-4 py-6">
      <div className="flex items-center gap-2 mb-6 px-2">
        <BrainCircuit className="h-7 w-7 text-mustard-500" />
        <span className="text-lg font-bold tracking-tight">KnowledgeAI</span>
      </div>

      <div className="mb-4">
        <WorkspaceSwitcher />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-mustard-500 text-charcoal-700'
                : 'text-offwhite-300 hover:bg-charcoal-600 hover:text-offwhite-100',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        {user?.role === 'admin' && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === '/admin'
                ? 'bg-mustard-500 text-charcoal-700'
                : 'text-offwhite-300 hover:bg-charcoal-600 hover:text-offwhite-100',
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-charcoal-500 pt-4 mt-4">
        <div className="px-2 mb-3">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-offwhite-400 truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-offwhite-300 hover:text-offwhite-100 hover:bg-charcoal-600"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { mobileOpen, setMobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile slide-out drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-72 bg-charcoal-700 border-charcoal-500 text-offwhite-100 [&>button]:text-offwhite-100 [&>button]:opacity-80 [&>button]:hover:opacity-100"
        >
          <SidebarContent onNavigate={closeMobile} />
        </SheetContent>
      </Sheet>
    </>
  );
}
