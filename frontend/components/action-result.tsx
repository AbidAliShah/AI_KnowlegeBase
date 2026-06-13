'use client';

import type { ActionResult } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, CheckCheck, FileText, Mail, ListChecks, Map } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function ActionResultView({ result }: { result: ActionResult }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (result.type === 'summarize') {
    return (
      <Card className="border-charcoal-200">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-charcoal-700">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Summary</span>
          </div>
          <h3 className="text-lg font-bold">{result.title}</h3>
          <p className="text-sm text-gray-700">{result.summary}</p>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Key points</p>
            <ul className="space-y-1.5">
              {result.bulletPoints.map((b, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-mustard-500 mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          {result.sources && result.sources.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              <span className="text-xs text-gray-500">Sources:</span>
              {result.sources.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void copyToClipboard(
                `${result.title}\n\n${result.summary}\n\n${result.bulletPoints.map((b) => '• ' + b).join('\n')}`,
              )
            }
          >
            {copied ? <CheckCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            Copy summary
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result.type === 'email_draft') {
    const full = `To: ${result.to}\nSubject: ${result.subject}\n\n${result.body}`;
    return (
      <Card className="border-blue-200">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-blue-700">
            <Mail className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Email draft</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex">
              <span className="font-semibold text-gray-500 w-16">To:</span>
              <span>{result.to}</span>
            </div>
            <div className="flex">
              <span className="font-semibold text-gray-500 w-16">Subject:</span>
              <span>{result.subject}</span>
            </div>
          </div>
          <div className="border rounded-md p-3 bg-gray-50 text-sm whitespace-pre-wrap">{result.body}</div>
          <Button size="sm" variant="outline" onClick={() => void copyToClipboard(full)}>
            {copied ? <CheckCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            Copy email
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result.type === 'create_tasks') {
    return (
      <Card className="border-green-200">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <ListChecks className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">
              {result.tasks.length} Tasks created
            </span>
          </div>
          <h3 className="text-lg font-bold">{result.topic}</h3>
          <ul className="space-y-2">
            {result.tasks.map((t, i) => (
              <li key={i} className="border-l-2 border-green-300 pl-3 py-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{t.title}</span>
                  <Badge
                    variant="outline"
                    className={
                      t.priority === 'high'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : t.priority === 'medium'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-gray-50 text-gray-700'
                    }
                  >
                    {t.priority}
                  </Badge>
                  {t.assignedTo && (
                    <Badge variant="secondary" className="text-xs">
                      @{t.assignedTo}
                    </Badge>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-gray-600 mt-0.5">{t.description}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 pt-2 border-t">
            Tasks saved to your workspace. View them in the Tasks page.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (result.type === 'create_plan') {
    return (
      <Card className="border-charcoal-200">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-charcoal-700">
            <Map className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Plan</span>
          </div>
          <h3 className="text-lg font-bold">{result.title}</h3>
          <p className="text-sm text-gray-700">{result.overview}</p>
          <div className="space-y-3">
            {result.sections.map((s, i) => (
              <div key={i} className="border-l-2 border-mustard-400 pl-3">
                <p className="font-semibold text-sm text-charcoal-700">{s.heading}</p>
                <ul className="mt-1 space-y-0.5">
                  {s.items.map((item, j) => (
                    <li key={j} className="text-sm flex gap-2">
                      <span className="text-mustard-500 mt-0.5">›</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const text =
                `${result.title}\n\n${result.overview}\n\n` +
                result.sections
                  .map(
                    (s) =>
                      `${s.heading}\n` + s.items.map((i) => `  • ${i}`).join('\n'),
                  )
                  .join('\n\n');
              void copyToClipboard(text);
            }}
          >
            {copied ? <CheckCheck className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            Copy plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  // answer
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <p className="text-sm whitespace-pre-wrap">{result.message}</p>
        {result.sources && result.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            <span className="text-xs text-gray-500">Sources:</span>
            {result.sources.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
