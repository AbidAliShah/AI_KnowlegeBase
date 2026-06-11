# KnowledgeAI – AI Knowledge Base SaaS for Companies

Production-ready SaaS for uploading PDF documents and chatting with them using AI (RAG). Built with Google Gemini (free tier), Next.js 14, Express, MongoDB, and Supabase vector search.

## Architecture

```
ai-pdf-chatbot-langchain/
├── backend/                  Express + LangChain API server
│   └── src/
│       ├── server.ts         Entry point
│       ├── config/           MongoDB connection
│       ├── models/           Mongoose models (User, Document, ChatSession)
│       ├── middleware/       Auth (JWT), error handler
│       ├── routes/           auth, documents, chat, admin
│       ├── services/         aiService.ts (PDF ingestion + RAG)
│       └── retrieval_graph/  LangGraph for Q&A pipeline
├── frontend/                 Next.js 14 (App Router) SaaS UI
│   └── app/
│       ├── (auth)/           login + register
│       └── (dashboard)/      dashboard, documents, chat, history, settings, admin
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui, lucide-react
- **Backend**: Node.js, Express, TypeScript, JWT auth
- **AI**: LangChain + LangGraph, Google Gemini (`gemini-2.5-flash` chat + `gemini-embedding-001` embeddings)
- **Database**: MongoDB (users, documents, chat history) + Supabase pgvector (3072-dim embeddings)
- **Security**: bcrypt password hashing, JWT, helmet, rate limiting

## Prerequisites

1. **Node.js 20+**
2. **MongoDB** (local install or [Atlas free tier](https://www.mongodb.com/atlas))
3. **Google API key** — free at [aistudio.google.com](https://aistudio.google.com)
4. **Supabase project** for vector storage ([supabase.com](https://supabase.com))

### Supabase setup

Create a free project, then in the SQL editor run:

```sql
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(3072)
);

create function match_documents (
  query_embedding vector(3072),
  match_count int default null,
  filter jsonb default '{}'
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) language plpgsql as $$
begin
  return query
  select documents.id, documents.content, documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where documents.metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.

## Local Development

### 1. Install dependencies

```powershell
npm install --legacy-peer-deps
```

### 2. Configure env files

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Edit `backend/.env` and fill in:
- `GOOGLE_API_KEY` — from [aistudio.google.com](https://aistudio.google.com)
- `MONGODB_URI` — e.g. `mongodb://localhost:27017/knowledgeai`
- `JWT_SECRET` — any long random string
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### 3. Start servers

**Terminal 1 — Backend:**
```powershell
cd backend
npx tsx src/server.ts
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npx next dev
```

Open http://localhost:3000.

The **first user to register becomes admin** (full access to `/admin` panel).

## API Endpoints

### Auth (`/api/auth`)
- `POST /register` — `{ name, email, password }` → `{ token, user }`
- `POST /login` — `{ email, password }` → `{ token, user }`
- `GET  /me` — current user (requires Bearer token)

### Documents (`/api/documents`) — all require auth
- `GET    /` — list user's documents
- `POST   /upload` — multipart `file` field (PDF only, max 10MB)
- `DELETE /:id` — remove document

### Chat (`/api/chat`) — all require auth
- `POST   /query` — `{ message, sessionId? }` → `{ sessionId, message, sources }`
- `GET    /sessions` — list user's chat history
- `GET    /sessions/:id` — full session with messages
- `DELETE /sessions/:id`

### Admin (`/api/admin`) — admin only
- `GET    /stats` — user/document counts + storage
- `GET    /users` — all users
- `DELETE /users/:id` — delete user and their data
- `GET    /documents` — all documents across all users

## Docker Deployment

```powershell
$env:GOOGLE_API_KEY="your-google-api-key"
$env:MONGODB_URI="mongodb://mongo:27017/knowledgeai"
$env:JWT_SECRET="your-long-random-secret"
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

docker-compose up -d
```

Frontend → http://localhost:3000, Backend → http://localhost:3001, MongoDB on 27017.

## Production Deployment

**Backend** — [Render](https://render.com) (free tier):
- Root directory: `backend`
- Build: `npm install && npm run build`
- Start: `node dist/server.js`
- Set all env vars from `backend/.env.example`

**Frontend** — [Vercel](https://vercel.com) (free tier):
- Root directory: `frontend`
- Set `NEXT_PUBLIC_API_URL` to your Render backend URL

**Databases**:
- MongoDB → [Atlas free tier](https://www.mongodb.com/atlas)
- Supabase free tier (vector search + embeddings)

## Security

- JWT in `Authorization: Bearer <token>` header
- Passwords bcrypt-hashed (12 rounds)
- Per-user data isolation (all queries scoped by `userId`)
- Rate limiting (200 req/15 min global, 15 auth req/15 min)
- helmet security headers
- CORS restricted to `FRONTEND_URL`

## License

MIT
