'use client';

import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import type { Task } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, ListChecks, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  low: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  const fetch = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data.tasks);
    } catch (err: unknown) {
      toast({
        title: 'Failed to load tasks',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { task } = await api.createTask({ title: newTitle.trim(), priority: newPriority });
      setTasks((prev) => [task, ...prev]);
      setNewTitle('');
    } catch (err: unknown) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (task: Task) => {
    const next: Task['status'] =
      task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    try {
      const { task: updated } = await api.updateTask(task._id, { status: next });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
    } catch (err: unknown) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err: unknown) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  const filtered = tasks.filter((t) => filter === 'all' || t.status === filter);
  const counts = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Tasks" />
      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4">
        <Card>
          <CardContent className="p-4">
            <form onSubmit={(e) => void create(e)} className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                placeholder="Add a new task..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1"
              />
              <div className="flex gap-2">
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as 'low' | 'medium' | 'high')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={creating || !newTitle.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-sm flex-wrap">
          {(['all', 'todo', 'in_progress', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full border ${
                filter === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              type="button"
            >
              {f === 'all'
                ? `All (${tasks.length})`
                : f === 'in_progress'
                  ? `In progress (${counts.in_progress})`
                  : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ListChecks className="h-12 w-12 mx-auto opacity-30 mb-3" />
            <p>No tasks {filter !== 'all' ? `in ${filter}` : 'yet'}. Add one above or generate via AI Actions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <Card key={task._id} className={task.status === 'done' ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={task.status === 'done'}
                    onCheckedChange={() => void toggleStatus(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium text-sm ${task.status === 'done' ? 'line-through' : ''}`}>
                        {task.title}
                      </p>
                      <Badge variant="outline" className={PRIORITY_COLORS[task.priority]}>
                        {task.priority}
                      </Badge>
                      {task.assignedTo && (
                        <Badge variant="secondary" className="text-xs">
                          @{task.assignedTo}
                        </Badge>
                      )}
                      {task.sourceType === 'ai_action' && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500 shrink-0"
                    onClick={() => void remove(task._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
