'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import type { ActionIntent, ActionResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, FileText, Mail, ListChecks, Map, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActionResultView } from '@/components/action-result';
import { cn } from '@/lib/utils';

interface IntentChip {
  id: ActionIntent | 'auto';
  label: string;
  icon: typeof Sparkles;
  color: string;
}

const INTENTS: IntentChip[] = [
  { id: 'auto', label: 'Auto-detect', icon: Sparkles, color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'summarize', label: 'Summarize', icon: FileText, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'email_draft', label: 'Email draft', icon: Mail, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'create_tasks', label: 'Create tasks', icon: ListChecks, color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'create_plan', label: 'Build plan', icon: Map, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'answer', label: 'Answer only', icon: MessageSquare, color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

const EXAMPLES: Record<string, string[]> = {
  summarize: ['Summarize the latest policy document', 'Give me a recap of the customer feedback'],
  email_draft: ['Draft an email to HR about new vacation policy', 'Write an email to the team announcing Q3 results'],
  create_tasks: ['Create an onboarding checklist for new engineers', 'Generate tasks for launching a new product feature'],
  create_plan: ['Build a 30-day onboarding plan for sales hires', 'Create a project plan for redesigning the website'],
};

export default function ActionsPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [intent, setIntent] = useState<ActionIntent | 'auto'>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = async () => {
    const text = query.trim();
    if (!text || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.runAction(text, intent === 'auto' ? undefined : intent);
      setResult(res.result);
    } catch (err: unknown) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const examples = intent === 'auto' || intent === 'answer' ? EXAMPLES['summarize']! : EXAMPLES[intent] ?? [];

  return (
    <div className="flex flex-col h-full">
      <Header title="AI Actions" />
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              What do you want AI to do?
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Beyond answering — AI can summarize, draft emails, create tasks, and build plans
              using your workspace documents.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {INTENTS.map((it) => (
              <button
                key={it.id}
                onClick={() => setIntent(it.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  intent === it.id
                    ? `${it.color} ring-2 ring-offset-1 ring-indigo-300`
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                )}
                type="button"
              >
                <it.icon className="h-3 w-3" />
                {it.label}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea
                placeholder="e.g. Create an onboarding plan for a new engineer joining the platform team..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                className="resize-none"
                disabled={loading}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {examples.slice(0, 2).map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setQuery(ex)}
                      className="text-xs text-gray-500 hover:text-indigo-600 underline-offset-2 hover:underline"
                      type="button"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => void run()}
                  disabled={loading || !query.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Run action
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Result</p>
              <ActionResultView result={result} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
