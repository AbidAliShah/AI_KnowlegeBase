'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useSidebar } from './sidebar-context';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const { openMobile } = useSidebar();
  const initials =
    user?.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() ?? '?';

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b bg-white shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-2 h-9 w-9"
          onClick={openMobile}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm text-gray-500 hidden sm:block truncate max-w-[200px]">
          {user?.email}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
