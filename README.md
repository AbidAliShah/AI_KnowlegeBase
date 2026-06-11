# KnowledgeAI – AI Knowledge Base SaaS for Companies

Production-ready SaaS for uploading documents and chatting with them using AI (RAG).

## Architecture

```
ai-pdf-chatbot-langchain/
├── backend/                  Express + LangChain API server
│   └── src/
│       ├── server.ts         Entry point
│       ├── config/           DB connection
│       ├── models/           Mongoose models (User, Document, ChatSession)
│       ├── middleware/       Auth (JWT), error handler
│       ├── routes/           auth, documents, chat, admin
│       ├── services/         aiService.ts (PDF ingestion + RAG)
│       ├── ingestion_graph/  LangGraph for indexing
│       └── retrieval_graph/  LangGraph for Q&A
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
- **AI**: LangChain + LangGraph, OpenAI (GPT-4o-mini + text-embedding-3-small)
- **Database**: MongoDB (users, documents, chat history) + Supabase pgvector (embeddings)
- **Security**: bcrypt password hashing, JWT, helmet, rate limiting

## Prerequisites

1. **Node.js 20+**
2. **MongoDB** (local install or [Atlas free tier](https://www.mongodb.com/atlas))
3. **OpenAI API key** ([platform.openai.com](https://platform.openai.com))
4. **Supabase project** for vector storage ([supabase.com](https://supabase.com))

### Supabase setup

Create a free project, then in the SQL editor run:

```sql
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);

create function match_documents (
  query_embedding vector(1536),
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
  select id, content, metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
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

Edit `backend/.env` and fill in `OPENAI_API_KEY`, `MONGODB_URI`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

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

The **first user to register becomes an admin** (full access to `/admin` panel).

## API Endpoints

### Auth (`/api/auth`)
- `POST /register` — `{ name, email, password }` → `{ token, user }`
- `POST /login` — `{ email, password }` → `{ token, user }`
- `GET  /me` — current user (requires Bearer token)

### Documents (`/api/documents`) — all require auth
- `GET    /` — list user's docs
- `POST   /upload` — multipart `file` field
- `DELETE /:id` — remove doc

### Chat (`/api/chat`) — all require auth
- `POST   /query` — `{ message, sessionId? }` → `{ sessionId, message, sources }`
- `GET    /sessions` — list user's chat history
- `GET    /sessions/:id` — full session
- `DELETE /sessions/:id`

### Admin (`/api/admin`) — admin only
- `GET    /stats` — counts + storage
- `GET    /users` — all users
- `DELETE /users/:id` — delete user + their data
- `GET    /documents` — all documents

## Docker Deployment

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:JWT_SECRET="..."
$env:SUPABASE_URL="https://..."
$env:SUPABASE_SERVICE_ROLE_KEY="..."

docker-compose up -d
```

Frontend → http://localhost:3000, Backend → http://localhost:3001, MongoDB on 27017.

## Production Deployment Notes

**Backend** (Render/Railway/Fly.io/AWS):
- Deploy `backend/` folder as Node.js service
- Set all env vars from `.env.example`
- Persistent volume for `uploads/` (or switch to S3)

**Frontend** (Vercel/Netlify):
- Deploy `frontend/` folder
- Set `NEXT_PUBLIC_API_URL` to your backend URL

**Database**:
- MongoDB → Atlas free tier
- Supabase free tier (handles embeddings + vector search)

## Security

- JWT in `Authorization: Bearer <token>` header
- Passwords bcrypt-hashed (12 rounds)
- Per-user data isolation (all queries scoped by `userId`)
- Rate limiting (200 req/15 min global, 15 auth req/15 min)
- helmet for security headers
- CORS restricted to `FRONTEND_URL`

## License

MIT
