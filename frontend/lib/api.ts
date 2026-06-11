export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface ApiDocument {
  _id: string;
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
  documents: number;
  chatSessions: number;
  storageBytes: number;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  overrideToken?: string,
): Promise<T> {
  const token = overrideToken ?? getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
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
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: (token?: string) => request<{ user: User }>('/api/auth/me', {}, token),

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
};
