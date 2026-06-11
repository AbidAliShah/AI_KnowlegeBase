'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Workspace } from '@/lib/api';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data.workspaces);

      const storedId = localStorage.getItem('workspaceId');
      const found = data.workspaces.find((w) => w._id === storedId);
      const next = found ?? data.workspaces[0] ?? null;
      if (next) {
        setCurrentWorkspace(next);
        localStorage.setItem('workspaceId', next._id);
      }
    } catch {
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void refreshWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      localStorage.removeItem('workspaceId');
    }
  }, [token, refreshWorkspaces]);

  const switchWorkspace = (id: string) => {
    const ws = workspaces.find((w) => w._id === id);
    if (!ws) return;
    setCurrentWorkspace(ws);
    localStorage.setItem('workspaceId', ws._id);
    // Reload so all pages re-fetch with new workspace context
    window.location.reload();
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const { workspace } = await api.createWorkspace(name);
    setWorkspaces((prev) => [...prev, workspace]);
    setCurrentWorkspace(workspace);
    localStorage.setItem('workspaceId', workspace._id);
    return workspace;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isLoading,
        switchWorkspace,
        refreshWorkspaces,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
