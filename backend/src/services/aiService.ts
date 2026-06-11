import { createRequire } from 'module';
import fs from 'fs/promises';
import WebSocket from 'ws';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { AIMessage } from '@langchain/core/messages';
import type { Document } from '@langchain/core/documents';
import { graph as retrievalGraph } from '../retrieval_graph/graph.js';

const require = createRequire(import.meta.url);

type PdfParseResult = { text: string; numpages: number };

function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    model: 'gemini-embedding-001',
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

export async function ingestPDF(
  filePath: string,
  workspaceId: string,
  userId: string,
  documentId: string,
): Promise<{ pageCount: number; chunkCount: number }> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env',
    );
  }
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured in backend/.env');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const pdfParse: (buf: Buffer) => Promise<PdfParseResult> = require('pdf-parse');
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);

  // Strip exam-style answer lines (long runs of dots) and collapse extra whitespace
  const cleanedText = data.text
    .replace(/\.{4,}/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleanedText.length < 50) {
    throw new Error(
      'Could not extract meaningful text from this PDF. It may be a scanned image or contain only form fields.',
    );
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const docs = await splitter.createDocuments(
    [cleanedText],
    [{ workspaceId, userId, documentId, source: filePath }],
  );

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      realtime: { transport: WebSocket as unknown as undefined },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  await SupabaseVectorStore.fromDocuments(docs, getEmbeddings(), {
    client: supabase,
    tableName: 'documents',
    queryName: 'match_documents',
  });

  return { pageCount: data.numpages, chunkCount: docs.length };
}

type ChatMsg = { role: string; content: string };

export async function queryDocuments(
  query: string,
  workspaceId: string,
  _history: ChatMsg[],
): Promise<{ answer: string; sources: string[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await retrievalGraph.invoke(
    { query, messages: [] },
    {
      configurable: {
        retrieverProvider: 'supabase',
        filterKwargs: { workspaceId },
        k: 5,
        queryModel: 'google-genai/gemini-2.5-flash',
        responseModel: 'google-genai/gemini-2.5-flash',
      },
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: unknown[] = (result as any).messages ?? [];
  const last = messages[messages.length - 1];
  const answer =
    last instanceof AIMessage ? (last.content as string) : 'Unable to generate a response.';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sources: string[] = ((result as any).documents ?? [])
    .map((d: Document) => d.metadata?.documentId ?? d.metadata?.source ?? '')
    .filter(Boolean) as string[];

  return { answer, sources };
}
