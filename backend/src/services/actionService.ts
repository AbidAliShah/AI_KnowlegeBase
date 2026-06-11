import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Task } from '../models/Task.js';
import { queryDocuments } from './aiService.js';

export type ActionIntent = 'summarize' | 'email_draft' | 'create_tasks' | 'create_plan' | 'answer';

export interface SummarizeResult {
  type: 'summarize';
  title: string;
  summary: string;
  bulletPoints: string[];
  sources?: string[];
}

export interface EmailDraftResult {
  type: 'email_draft';
  to: string;
  subject: string;
  body: string;
}

export interface TaskItem {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
}

export interface CreateTasksResult {
  type: 'create_tasks';
  topic: string;
  tasks: TaskItem[];
  createdTaskIds: string[];
}

export interface PlanSection {
  heading: string;
  items: string[];
}

export interface CreatePlanResult {
  type: 'create_plan';
  title: string;
  overview: string;
  sections: PlanSection[];
}

export interface AnswerResult {
  type: 'answer';
  message: string;
  sources?: string[];
}

export type ActionResult =
  | SummarizeResult
  | EmailDraftResult
  | CreateTasksResult
  | CreatePlanResult
  | AnswerResult;

function getModel(): ChatGoogleGenerativeAI {
  return new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.4,
  });
}

function extractJSON<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export async function detectIntent(query: string): Promise<ActionIntent> {
  const model = getModel();
  const prompt = `Classify the user's request into ONE intent. Respond with ONLY the intent name, no other text.

Intents:
- summarize: User wants a summary, overview, or recap of documents
- email_draft: User wants to draft, write, or compose an email
- create_tasks: User wants a checklist, task list, action items, or to-do list
- create_plan: User wants a structured plan, roadmap, strategy, or onboarding/training plan
- answer: User is asking a general question for information

Request: "${query}"

Intent:`;

  const res = await model.invoke(prompt);
  const text = (res.content as string).trim().toLowerCase();
  const valid: ActionIntent[] = ['summarize', 'email_draft', 'create_tasks', 'create_plan', 'answer'];
  return valid.find((v) => text.includes(v)) ?? 'answer';
}

async function getContext(query: string, workspaceId: string): Promise<{ context: string; sources: string[] }> {
  const { answer, sources } = await queryDocuments(query, workspaceId, []);
  return { context: answer, sources };
}

export async function executeSummarize(query: string, workspaceId: string): Promise<SummarizeResult> {
  const { context, sources } = await getContext(query, workspaceId);
  const model = getModel();
  const prompt = `Based on the following information, produce a summary as JSON with this exact structure:
{
  "title": "short title for the summary",
  "summary": "2-3 sentence executive summary",
  "bulletPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"]
}

User request: ${query}

Information from knowledge base:
${context}

Return only the JSON object, no other text.`;

  const res = await model.invoke(prompt);
  const parsed = extractJSON<Omit<SummarizeResult, 'type' | 'sources'>>(res.content as string);
  return {
    type: 'summarize',
    title: parsed?.title ?? 'Summary',
    summary: parsed?.summary ?? (res.content as string),
    bulletPoints: parsed?.bulletPoints ?? [],
    sources,
  };
}

export async function executeEmailDraft(query: string, workspaceId: string): Promise<EmailDraftResult> {
  const { context } = await getContext(query, workspaceId);
  const model = getModel();
  const prompt = `Draft a professional email as JSON with this exact structure:
{
  "to": "recipient role or email (e.g. 'HR Team', 'john@company.com')",
  "subject": "clear concise subject line",
  "body": "full email body in plain text with proper paragraphs separated by \\n\\n. Include greeting and sign-off."
}

User request: ${query}

Relevant context from knowledge base:
${context}

Return only the JSON object.`;

  const res = await model.invoke(prompt);
  const parsed = extractJSON<Omit<EmailDraftResult, 'type'>>(res.content as string);
  return {
    type: 'email_draft',
    to: parsed?.to ?? 'recipient',
    subject: parsed?.subject ?? 'Re: your request',
    body: parsed?.body ?? (res.content as string),
  };
}

export async function executeCreateTasks(
  query: string,
  workspaceId: string,
  userId: string,
): Promise<CreateTasksResult> {
  const { context } = await getContext(query, workspaceId);
  const model = getModel();
  const prompt = `Create a list of actionable tasks as JSON with this exact structure:
{
  "topic": "short topic name (e.g. 'New Employee Onboarding')",
  "tasks": [
    { "title": "task title", "description": "what to do", "priority": "high", "assignedTo": "role like HR or IT" }
  ]
}

priority must be one of: low, medium, high
Generate 5-10 specific, actionable tasks.

User request: ${query}

Relevant context:
${context}

Return only the JSON object.`;

  const res = await model.invoke(prompt);
  const parsed = extractJSON<{ topic: string; tasks: TaskItem[] }>(res.content as string);
  const topic = parsed?.topic ?? 'Generated tasks';
  const tasks = (parsed?.tasks ?? []).slice(0, 15);

  const created = await Task.insertMany(
    tasks.map((t) => ({
      workspaceId,
      createdBy: userId,
      title: t.title,
      description: t.description,
      priority: ['low', 'medium', 'high'].includes(t.priority) ? t.priority : 'medium',
      assignedTo: t.assignedTo,
      sourceType: 'ai_action',
    })),
  );

  return {
    type: 'create_tasks',
    topic,
    tasks,
    createdTaskIds: created.map((t) => t._id.toString()),
  };
}

export async function executeCreatePlan(query: string, workspaceId: string): Promise<CreatePlanResult> {
  const { context } = await getContext(query, workspaceId);
  const model = getModel();
  const prompt = `Create a structured plan as JSON with this exact structure:
{
  "title": "plan title",
  "overview": "1-2 sentence overview of the plan",
  "sections": [
    { "heading": "Phase / Section Name", "items": ["step 1", "step 2", "step 3"] }
  ]
}

Generate 3-6 sections, each with 3-7 items.

User request: ${query}

Relevant context:
${context}

Return only the JSON object.`;

  const res = await model.invoke(prompt);
  const parsed = extractJSON<Omit<CreatePlanResult, 'type'>>(res.content as string);
  return {
    type: 'create_plan',
    title: parsed?.title ?? 'Plan',
    overview: parsed?.overview ?? '',
    sections: parsed?.sections ?? [],
  };
}

export async function runAction(
  query: string,
  workspaceId: string,
  userId: string,
  forcedIntent?: ActionIntent,
): Promise<ActionResult> {
  const intent = forcedIntent ?? (await detectIntent(query));

  switch (intent) {
    case 'summarize':
      return executeSummarize(query, workspaceId);
    case 'email_draft':
      return executeEmailDraft(query, workspaceId);
    case 'create_tasks':
      return executeCreateTasks(query, workspaceId, userId);
    case 'create_plan':
      return executeCreatePlan(query, workspaceId);
    case 'answer':
    default: {
      const { answer, sources } = await queryDocuments(query, workspaceId, []);
      return { type: 'answer', message: answer, sources };
    }
  }
}
