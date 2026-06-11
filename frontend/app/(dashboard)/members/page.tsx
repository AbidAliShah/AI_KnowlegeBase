'use client';

import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import type { WorkspaceMember, WorkspaceRole } from '@/lib/api';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  member: 'bg-blue-100 text-blue-700 border-blue-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function MembersPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const data = await api.getWorkspaceMembers(currentWorkspace._id);
      setMembers(data.members);
    } catch (err: unknown) {
      toast({
        title: 'Failed to load members',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, toast]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const isOwnerOrAdmin =
    currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';
  const isOwner = currentWorkspace?.role === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail) return;
    setInviting(true);
    try {
      await api.inviteMember(currentWorkspace._id, inviteEmail, inviteRole);
      toast({ title: 'Member added', description: inviteEmail });
      setInviteEmail('');
      await fetchMembers();
    } catch (err: unknown) {
      toast({
        title: 'Invite failed',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: WorkspaceRole) => {
    if (!currentWorkspace) return;
    try {
      await api.updateMemberRole(currentWorkspace._id, userId, role);
      toast({ title: 'Role updated' });
      await fetchMembers();
    } catch (err: unknown) {
      toast({
        title: 'Failed to update role',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!currentWorkspace) return;
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await api.removeMember(currentWorkspace._id, userId);
      toast({ title: 'Member removed' });
      await fetchMembers();
    } catch (err: unknown) {
      toast({
        title: 'Failed to remove',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Members" />
      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        {isOwnerOrAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5" /> Invite member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleInvite(e)} className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="email">Email of registered user</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:w-40">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviting}>
                  {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-3">
                User must already have a KnowledgeAI account to be invited.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" /> Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const isSelf = m.userId._id === user?._id;
                  return (
                    <div
                      key={m._id}
                      className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold shrink-0">
                        {m.userId.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {m.userId.name} {isSelf && <span className="text-gray-400 text-xs">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{m.userId.email}</p>
                      </div>
                      {isOwner && !isSelf && m.role !== 'owner' ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) => void handleRoleChange(m.userId._id, v as WorkspaceRole)}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={ROLE_COLORS[m.role]} variant="outline">
                          {m.role}
                        </Badge>
                      )}
                      {isOwnerOrAdmin && m.role !== 'owner' && !isSelf && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => void handleRemove(m.userId._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
