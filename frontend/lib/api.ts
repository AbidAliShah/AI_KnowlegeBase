export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type WorkspacePlan = 'free' | 'team' | 'business' | 'enterprise';

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: WorkspacePlan;
  seatLimit: number;
  documentLimit: number;
  role?: WorkspaceRole;
  memberCount?: number;
  createdAt: string;
}

export interface WorkspaceMember {
  _id: string;
  workspaceId: string;
  userId: { _id: string; email: string; name: string };
  role: WorkspaceRole;
  joinedAt: string;
}

export interface ApiDocument {
  _id: string;
  workspaceId?: string;
  originalName: string;
  size: number;
  status: 'processing' | 'ready' | 'failed';
  pageCount?: number;
  chunkCount?: number;
  errorMessage?: string;
  createdAt: string;
  userId?: User;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: string;
}

export interface ChatSession {
  _id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  users: number;
  workspaces: number;
  documents: number;
  chatSessions: number;
  storageBytes: number;
}

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

export interface Task {
  _id: string;
  workspaceId: string;
  createdBy: { _id: string; name: string; email: string } | string;
  assignedTo?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  sourceType?: 'manual' | 'ai_action';
  createdAt: string;
  updatedAt: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('workspaceId');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  overrideToken?: string,
): Promise<T> {
  const token = overrideToken ?? getToken();
  const workspaceId = getWorkspaceId();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (workspaceId) headers['X-Workspace-Id'] = workspaceId;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ message: 'Request failed' }))) as {
      message?: string;
    };
    throw new Error(err.message ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User; workspace: Workspace }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: (token?: string) => request<{ user: User }>('/api/auth/me', {}, token),

  // Workspaces
  getWorkspaces: () => request<{ workspaces: Workspace[] }>('/api/workspaces'),
  createWorkspace: (name: string) =>
    request<{ workspace: Workspace }>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  getCurrentWorkspace: () =>
    request<{ workspace: Workspace }>('/api/workspaces/current/info'),
  updateWorkspace: (id: string, name: string) =>
    request<{ workspace: Workspace }>(`/api/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  getWorkspaceMembers: (id: string) =>
    request<{ members: WorkspaceMember[] }>(`/api/workspaces/${id}/members`),
  inviteMember: (id: string, email: string, role: WorkspaceRole) =>
    request<{ member: WorkspaceMember }>(`/api/workspaces/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  updateMemberRole: (id: string, userId: string, role: WorkspaceRole) =>
    request<{ member: WorkspaceMember }>(`/api/workspaces/${id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (id: string, userId: string) =>
    request<{ ok: boolean }>(`/api/workspaces/${id}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Documents
  getDocuments: () => request<{ documents: ApiDocument[] }>('/api/documents'),

  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ document: ApiDocument }>('/api/documents/upload', {
      method: 'POST',
      body: form,
    });
  },

  deleteDocument: (id: string) =>
    request<{ message: string }>(`/api/documents/${id}`, { method: 'DELETE' }),

  // Chat
  getChatSessions: () => request<{ sessions: ChatSession[] }>('/api/chat/sessions'),

  getChatSession: (id: string) =>
    request<{ session: ChatSession }>(`/api/chat/sessions/${id}`),

  sendMessage: (message: string, sessionId?: string) =>
    request<{ sessionId: string; message: string; sources: string[] }>('/api/chat/query', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),

  deleteChatSession: (id: string) =>
    request<{ message: string }>(`/api/chat/sessions/${id}`, { method: 'DELETE' }),

  // Admin
  getAdminStats: () => request<AdminStats>('/api/admin/stats'),
  getAdminUsers: () => request<{ users: User[] }>('/api/admin/users'),
  deleteUser: (id: string) =>
    request<{ message: string }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  getAdminDocuments: () => request<{ documents: ApiDocument[] }>('/api/admin/documents'),

  // Actions
  runAction: (query: string, intent?: ActionIntent) =>
    request<{ result: ActionResult }>('/api/actions/execute', {
      method: 'POST',
      body: JSON.stringify({ query, intent }),
    }),

  // Tasks
  getTasks: () => request<{ tasks: Task[] }>('/api/tasks'),
  createTask: (data: Partial<Task>) =>
    request<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Partial<Task>) =>
    request<{ task: Task }>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    request<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
};
