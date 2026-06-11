'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/layout/header';
import { api } from '@/lib/api';
import type { ApiDocument } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Trash2, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: ApiDocument['status'] }) {
  if (status === 'ready')
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
      </Badge>
    );
  if (status === 'failed')
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">
        <XCircle className="h-3 w-3 mr-1" /> Failed
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
      <Clock className="h-3 w-3 mr-1 animate-pulse" /> Processing
    </Badge>
  );
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data.documents);
    } catch {
      /* ignore */
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocs();
    const interval = setInterval(() => void fetchDocs(), 5000);
    return () => clearInterval(interval);
  }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadDocument(file);
      toast({ title: 'Upload started', description: 'Your document is being processed.' });
      await fetchDocs();
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Upload failed',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      toast({ title: 'Deleted', description: 'Document removed successfully.' });
    } catch (err: unknown) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Delete failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Documents" />
      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Upload zone */}
        <Card
          className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
            {uploading ? (
              <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            ) : (
              <Upload className="h-10 w-10 text-indigo-400" />
            )}
            <div>
              <p className="font-semibold text-gray-700">
                {uploading ? 'Uploading…' : 'Click to upload a PDF'}
              </p>
              <p className="text-sm text-gray-400 mt-1">PDF files up to 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => void handleUpload(e)}
            />
          </CardContent>
        </Card>

        {/* Document list */}
        {loadingDocs ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="h-12 w-12 mx-auto opacity-30 mb-3" />
            <p>No documents yet. Upload your first PDF above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                    <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span>{formatBytes(doc.size)}</span>
                        {doc.pageCount && <span>{doc.pageCount} pages</span>}
                        {doc.chunkCount && <span>{doc.chunkCount} chunks</span>}
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <StatusBadge status={doc.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => void handleDelete(doc._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {doc.status === 'failed' && doc.errorMessage && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs font-semibold text-red-700 mb-1">Error:</p>
                      <p className="text-xs text-red-600 break-words">{doc.errorMessage}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
