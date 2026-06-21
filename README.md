# CivicPulse — AI Legal Rights Assistant

> An AI-powered platform that helps Indian citizens understand complex legal documents, exercise their civic rights, and generate professional legal documents — in English and Hindi.

**Live:** [civicpulse.pro](https://civicpulse.pro) &nbsp;|&nbsp; **API:** [Render-hosted FastAPI](https://civicpulse-backend.onrender.com)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Breakdown](#component-breakdown)
   - [Frontend (Next.js)](#1-frontend-nextjs)
   - [Backend (FastAPI)](#2-backend-fastapi)
   - [Ingestion Pipeline](#3-ingestion-pipeline)
   - [RAG Pipeline](#4-rag-pipeline--retrieval-augmented-generation)
   - [Live Voice Pipeline](#5-live-voice-pipeline)
   - [Chat Mode](#6-chat-mode)
   - [Drafting Lab](#7-drafting-lab)
   - [Admin Panel](#8-admin-panel)
4. [Data Flow — End to End](#data-flow--end-to-end)
5. [Infrastructure & Services](#infrastructure--services)
6. [Project Structure](#project-structure)
7. [Local Development Setup](#local-development-setup)
8. [Environment Variables](#environment-variables)
9. [Deployment](#deployment)

---

## System Overview

CivicPulse is a **full-stack RAG (Retrieval-Augmented Generation) platform** with three distinct user-facing modes:

| Mode | Description | Transport |
|------|-------------|-----------|
| **Live** | Real-time voice conversation with the AI legal assistant | WebSocket (full-duplex) |
| **Chat** | Text-based Q&A with session history and document uploads | SSE Streaming |
| **Drafting Lab** | AI-assisted generation of legal documents (RTI, complaints, notices) | SSE Streaming |

All three modes share a single **RAG backbone** — the same embedding model, vector store, and LLM — but each uses a different **system prompt**, **token budget**, and **output format**.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER (Next.js 15)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Live Mode│  │Chat Mode │  │ Drafting Lab │  │  Admin Panel  │  │
│  │(WebSocket│  │  (SSE)   │  │    (SSE)     │  │ (Socket.IO)   │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └───────┬───────┘  │
└───────┼─────────────┼───────────────┼──────────────────┼───────────┘
        │             │               │                  │
        ▼             ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python 3.11)                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ /api/live  │ │ /api/chat  │ │/api/drafts │ │   /api/admin     │ │
│  │  WebSocket │ │ POST/stream│ │ POST/stream│ │  + Socket.IO     │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └────────┬─────────┘ │
│        └──────────────┴──────────────┴─────────────────┘            │
│                               │                                      │
│                    ┌──────────▼──────────┐                          │
│                    │    RAG Pipeline      │                          │
│                    │  (rag_pipeline.py)   │                          │
│                    └──────────┬──────────┘                          │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
  ┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
  │  Amazon     │      │  OpenSearch  │      │    DynamoDB     │
  │  Bedrock    │      │  (Vectors)   │      │ (Sessions/Jobs) │
  │Claude Haiku │      │  KNN Index   │      │                 │
  │Titan Embed  │      │              │      │                 │
  └─────────────┘      └──────────────┘      └─────────────────┘
```

---

## Component Breakdown

### 1. Frontend (Next.js)

**Path:** `frontend/`  
**Framework:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS  
**Auth:** Clerk (JWT-based, all protected routes)  
**State:** Redux Toolkit (5 slices: auth, chat, documents, live, ui)

#### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page with feature showcase |
| `/live` | Real-time voice interface with mic, camera, and TTS |
| `/chat` | Text chat with session history and file uploads |
| `/draftcreation` | Legal document generation wizard |
| `/admin` | Admin-only control panel (ingestion, vector CRUD, analytics) |
| `/architecture` | Interactive system architecture diagram (ReactFlow) |
| `/sign-in` / `/sign-up` | Clerk-powered auth screens |

#### Key Custom Hooks

| Hook | Responsibility |
|------|---------------|
| `useLiveWebSocket.ts` | Manages the full-duplex WebSocket for the Live voice mode; handles connect/disconnect, message dispatch, audio streaming |
| `useLiveAudio.ts` | Captures microphone audio, chunks it into PCM frames, sends to Deepgram STT; falls back to Web Speech API |
| `useChat.ts` | Session creation, SSE streaming consumer, message history management |
| `useSocket.ts` | Socket.IO client for Admin panel ingestion progress events |
| `useUpload.ts` | File validation (50 MB limit, MIME type check) and multipart upload to backend |
| `useSupabaseRealtime.ts` | Real-time DB subscription hooks (supplementary) |

---

### 2. Backend (FastAPI)

**Path:** `backend/`  
**Framework:** FastAPI (Python 3.11+), Uvicorn ASGI  
**Auth:** Clerk JWT verification via `app/core/auth.py`

#### API Routers

| Prefix | File | Description |
|--------|------|-------------|
| `/api/live` | `routes/live.py` | WebSocket endpoint for Live Voice mode; manages `ConnectionManager` per session |
| `/api/chat` | `routes/chat.py` | REST + SSE endpoints for Chat mode; session CRUD, message streaming |
| `/api/drafts` | `routes/drafts.py` | SSE endpoints for legal document generation; draft history |
| `/api/admin` | `routes/admin.py` | Admin-only ingestion, job tracking, S3/OpenSearch/DynamoDB CRUD |
| `/api/upload` | `routes/upload.py` | Quick file upload utility |
| `/api/analyze` | `routes/analyze.py` | One-shot document analysis endpoint |
| `/api/user` | `routes/user.py` | User profile management (name, address, contact for draft auto-fill) |
| `/socket.io` | `core/socket_manager.py` | Socket.IO ASGI app mounted for Admin ingestion progress |

#### Core Modules

- **`core/auth.py`** — Verifies Clerk JWTs, provides `get_current_user` and `get_admin_user` dependency injectors
- **`core/socket_manager.py`** — Socket.IO server; emits `ingestion_progress` events with stage/progress/detail payloads
- **`core/ocr_gatekeeper.py`** — Decides whether to use AWS Textract or local OCR based on monthly page budget (1,000 pages/month free tier)

---

### 3. Ingestion Pipeline

The pipeline converts raw documents into searchable vectors in OpenSearch. It is triggered by Admin uploads or user document uploads and runs entirely as a **FastAPI `BackgroundTask`**.

```
Admin/User Upload
      │
      ▼
  AWS S3 (Raw Storage)
      │
      ▼
  Parsing Layer  ─────────────────────────────────────
  │  pdf_ingest.py   → AWS Textract (primary)        │
  │                    pdfplumber + Tesseract OCR     │  Fallback if
  │  image_ingest.py → pytesseract (direct OCR)      │  Textract quota
  │  web_ingest.py   → Playwright scraper + clean    │  is exceeded
  └──────────────────────────────────────────────────
      │
      ▼
  Semantic Chunking  (embedding_service.py)
  RecursiveCharacterTextSplitter
  chunk_size=800, overlap=100
      │
      ▼
  Parallel Embedding  (embedding_service.py)
  Amazon Titan Embed Text v1  (1536-dim vectors)
  asyncio.gather() with global semaphore (15 concurrent)
      │
      ▼
  OpenSearch Bulk Index  (vector_service.py)
  Each chunk stored with full metadata:
  { vector, text, source, source_type, uploaded_by, region, type, chunk_index }
      │
      ▼
  Job Status Update → DynamoDB (CivicPulseJobs)
  Socket.IO progress event → Admin browser
```

**Multi-tenancy:** Every chunk is tagged `source_type: "global"` (Admin) or `source_type: "private"` (user). The vector search filter enforces this — a user can never retrieve another user's private data.

**Job Control:** Admins can cancel a running job. On cancellation:
1. `job_tracker.cancel_job()` flags the record in DynamoDB
2. The background task checks `is_cancelled()` between stages
3. All partial vectors are deleted via `vector_service.delete_document_by_source()`
4. The raw S3 file is also deleted

**Concurrency limit:** `INGESTION_SEMAPHORE = asyncio.Semaphore(2)` — max 2 heavy OCR jobs run simultaneously to protect small EC2 instances.

---

### 4. RAG Pipeline — Retrieval-Augmented Generation

**File:** `backend/app/services/rag_pipeline.py`

The central intelligence engine. All three user-facing modes funnel through `RagPipeline.analyze_document()`.

```
User Query (text)
      │
      ├─ [Live mode] Junk query filter (noise / short utterances)
      │
      ▼
Step 1: Conversation Context
  _build_conversation_context(chat_history)
  ≤12 msgs: verbatim | >12 msgs: summarise older turns
      │
      ▼
Step 2: Query Embedding
  Amazon Titan Embed v1  → 1536-dim vector
      │
      ▼
Step 3: Vector Search (OpenSearch)
  ├─ Topic boost? (TOPIC_SOURCE_MAP keyword match)
  │   → similarity_search_with_boost() — function_score × 1.8 for matched laws
  └─ No boost → similarity_search() — plain KNN (k = top_k × 3)
      │
      ▼
Step 3.5: Reranking (Cohere)
  rerank-multilingual-v3.0
  Reduces 15 candidates → top 5 (or top_k per mode)
      │
      ▼
Step 4: Prompt Construction
  Mode-aware template selection:
  ├─ live    → live_prompt.txt  (or draft_phase.txt if drafting intent detected)
  ├─ chat    → system_prompt.txt
  └─ draft   → draft_file.txt
  + Emergency override prepended if EMERGENCY_KEYWORDS detected
  + Language instruction appended (EN/HI)
      │
      ▼
Step 5: LLM Call — AWS Bedrock
  Model: anthropic.claude-3-haiku-20240307-v1:0
  ├─ stream=True  → invoke_model_with_response_stream() → generator
  └─ stream=False → invoke_model() → full response
  Throttling: BoundedSemaphore(3) + exponential backoff (5 retries)
      │
      ▼
  Result stored in DynamoDB (CivicPulseResults)
  Returned to caller as stream or string
```

**Mode configuration:**

| Mode | top_k | max_tokens | temperature | Use case |
|------|-------|-----------|-------------|----------|
| `live` | 5 | 700 | 0.4 | Concise spoken answers |
| `chat` | 5 | 1024 | 0.7 | Conversational text |
| `draft` | 8 | 2048 | 0.6 | Full document generation |

**Special classifiers (pre-LLM, zero-cost):**
- `detect_draft_intent()` — keyword + context-sticky heuristic; routes to `draft_phase.txt` prompt mid-conversation
- `detect_emergency()` — 30+ keywords (assault, kidnap, etc.); prepends triage override block
- `detect_language()` — Devanagari script count → English anchor words → Hinglish keyword density → LLM fallback
- `get_boosted_sources()` — maps topic keywords to specific law names for source-level vector boosting

---

### 5. Live Voice Pipeline

**Files:** `routes/live.py`, `services/elevenlabs_service.py`, `services/sarvamai_service.py`

Full-duplex WebSocket pipeline: voice in → AI text out → TTS audio back.

```
Browser (mic)
    │  Web Audio API / Deepgram WS SDK
    ▼
Deepgram STT (primary)  OR  Web Speech API (fallback)
    │  Final transcript text
    ▼
FastAPI WebSocket  /api/live/ws/{session_id}
    │  JWT auth on connect (query param ?token=)
    ▼
  Message type dispatch:
  ├─ "config"          → set language (en/hi)
  ├─ "request_greeting"→ send_greeting() with TTS
  ├─ "user_text"       → language auto-detect → process_voice_turn()
  ├─ "interrupt"       → cancel active asyncio.Task
  └─ "session_end"     → delete DynamoDB session
    │
    ▼  process_voice_turn()
  Load history from DynamoDB (last N turns)
    │
    ▼
  RAG Pipeline (mode="live", stream=True)
    │  LLM text stream
    ▼
  text_iterator()  strips <DRAFT_READY .../> tags silently
    │              fires "draft_completed" WebSocket event when tag found
    ▼
  TTS Router (language-conditional):
  ├─ Hindi  → Sarvam AI (bulbul-v1)  → WAV chunks
  └─ English → ElevenLabs (turbo-v2.5) + Edge TTS fallback → MP3 chunks
    │
    ▼
  Base64-encode each chunk → WebSocket "audio_stream" event
    │
    ▼
  Browser AudioContext → gapless playback
    │
    ▼
  Persist turn to DynamoDB (asyncio.to_thread)
```

**Session lifecycle:** DynamoDB session is created on WebSocket connect, preserved on accidental disconnect (4-hour TTL), and explicitly deleted on `session_end` message.

---

### 6. Chat Mode

**Files:** `routes/chat.py`, `services/chat_service.py`

```
POST /api/chat/stream
    │  {session_id, message, language}
    ▼
  Load session messages from DynamoDB
    │
    ▼
  RAG Pipeline (mode="chat", stream=True)
    │  Generator
    ▼
  StreamingResponse (text/event-stream)
  data: {"content": "<chunk>"}  ... data: {"done": true}
    │
    ▼
  Full response saved to session in DynamoDB
  Auto-title generated for new sessions (get_simple_completion)
```

**Session CRUD:** `create_session`, `get_session`, `list_sessions`, `delete_session`, `update_session_title`, `share_session` — all in `chat_service.py` backed by DynamoDB.

**User document upload:** `POST /api/chat/upload` — validates MIME type, uploads to S3, fires background ingestion tagged `source_type: "private"` with `uploaded_by: user_id`.

---

### 7. Drafting Lab

**Files:** `routes/drafts.py`, `services/draft_service.py`

```
POST /api/drafts/stream
    │  {session_id, message, draft_type, topic, use_profile}
    ▼
  [Optional] Load user profile (name, address, contact, email)
  Injected into system prompt for auto-fill
    │
    ▼
  RAG Pipeline (mode="draft", stream=True)
  Uses draft_file.txt system prompt (structured doc format)
    │  Generator
    ▼
  StreamingResponse (text/event-stream)
    │
    ▼
  Full document saved to:
  ├─ Chat session history (DynamoDB)
  └─ Draft history table (DynamoDB CivicPulseDrafts)
```

**Supported document types:** RTI applications, consumer complaints, legal notices, affidavits, appeal letters, police complaints.

**Profile auto-fill:** If the user has saved their profile (`/api/user`), the draft prompt is enriched with their personal details to fill sender fields automatically.

---

### 8. Admin Panel

**Files:** `routes/admin.py`, `frontend/src/app/admin/`

A protected control panel (whitelist-based admin email check) providing:

| Feature | Endpoint | Description |
|---------|---------|-------------|
| Ingest PDF | `POST /api/admin/ingest` | Upload + background pipeline; real-time progress via Socket.IO |
| Ingest Image | same | OCR → chunk → embed |
| Ingest Web/Text | same | Playwright scrape or raw text |
| Ingest from URL | same | Downloads PDF from URL → S3 → pipeline |
| List Jobs | `GET /api/admin/jobs` | All ingestion jobs (running/completed/failed) |
| Cancel Job | `POST /api/admin/jobs/{id}/cancel` | Cancels job + cleans up S3 + vectors |
| Vector Browser | `GET /api/admin/vectors` | Paginated OpenSearch index |
| Batch Delete | `POST /api/admin/vectors/batch-delete` | Removes vector chunks by ID |
| DynamoDB Browser | `GET /api/admin/dynamodb` | All chat/analysis logs |
| S3 Browser | `GET /api/admin/s3` | Lists files enriched with job status + vector count |
| Usage Stats | `GET /api/admin/dynamodb/stats` | 7-day query/pages chart |

**Socket.IO progress events** (`ingestion_progress`):
```json
{
  "progress": 65,
  "stage": "embedding",
  "message": "Embedding chunk 52/80...",
  "detail": { "chunks_embedded": 52, "total_chunks": 80 }
}
```
Stages: `upload → extraction → chunking → embedding → storing → done / error / cancelled`

---

## Data Flow — End to End

### A. Ingestion Flow (Admin → Knowledge Base)

```
Admin selects file in UI
  → Frontend POSTs multipart to /api/admin/ingest (with X-Socket-Id header)
  → Backend uploads raw file to S3
  → Creates Job record in DynamoDB (CivicPulseJobs)
  → FastAPI BackgroundTask: _run_admin_ingestion()
      ├─ OCR/Parse (Textract or local fallback)
      ├─ Chunk text (800 chars, 100 overlap)
      ├─ Embed chunks in parallel (Titan v1)
      ├─ Bulk index in OpenSearch (tagged global)
      └─ Update job status in DynamoDB
  → Socket.IO emits progress% to Admin browser in real time
  → Frontend IngestionTab polls /api/admin/jobs for final status
```

### B. Query Flow (User → AI Response)

```
User types / speaks query
  → Frontend sends to /api/chat/stream or WS /api/live/ws/{id}
  → Backend: JWT verified → session loaded from DynamoDB
  → RAG Pipeline:
      1. Embed query (Titan v1)
      2. KNN search OpenSearch (k=15)
      3. Cohere Rerank → top 5 chunks
      4. Build system prompt + context + history
      5. Call Bedrock (Claude 3 Haiku) — streaming
  → Response streamed back (SSE chunks / WS messages)
  → [Live] Chunks piped to ElevenLabs/Sarvam → audio streamed to browser
  → [Chat/Draft] Full text saved to session history in DynamoDB
```

---

## Infrastructure & Services

| Service | Provider | Purpose |
|---------|---------|---------|
| **LLM** | AWS Bedrock — Claude 3 Haiku | Text generation (all modes) |
| **Embeddings** | AWS Bedrock — Amazon Titan Embed v1 | 1536-dim vector generation |
| **Vector Store** | AWS OpenSearch Service | KNN vector index (civicpulse index) |
| **Session Store** | AWS DynamoDB | Chat sessions, live sessions, jobs, drafts, profiles |
| **File Storage** | AWS S3 | Raw documents (PDFs, images) |
| **OCR (primary)** | AWS Textract | PDF/image text extraction (1,000 pg/mo free) |
| **OCR (fallback)** | Tesseract + pdfplumber | Local OCR when Textract quota is exceeded |
| **Reranking** | Cohere — rerank-multilingual-v3.0 | Cross-encoder refinement of vector results |
| **TTS — English** | ElevenLabs (+ Edge TTS fallback) | Voice synthesis for English Live mode |
| **TTS — Hindi** | Sarvam AI (bulbul-v1) | Voice synthesis for Hindi Live mode |
| **STT** | Deepgram (+ Web Speech API fallback) | Speech-to-text for Live mode |
| **Auth** | Clerk | JWT issuance, user management |
| **Frontend hosting** | Vercel | Next.js edge deployment |
| **Backend hosting** | Render (Docker) | FastAPI + Uvicorn container |

---

## Project Structure

```
civicpulse/
├── frontend/                   # Next.js 15 application
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Landing page
│       │   ├── live/           # Live Voice Mode
│       │   ├── chat/           # Chat Mode
│       │   ├── draftcreation/  # Drafting Lab
│       │   ├── admin/          # Admin Panel
│       │   └── architecture/   # Interactive diagram
│       ├── hooks/              # Custom React hooks
│       ├── store/slices/       # Redux Toolkit slices
│       ├── components/         # Shared UI components
│       ├── contexts/           # React contexts
│       └── lib/                # Utilities / API client
│
├── backend/                    # FastAPI application
│   └── app/
│       ├── main.py             # App entry, router registration, CORS
│       ├── config.py           # AWS client config, env loading
│       ├── routes/             # API route handlers
│       │   ├── live.py         # WebSocket live voice
│       │   ├── chat.py         # Chat + user document upload
│       │   ├── drafts.py       # Legal document generation
│       │   ├── admin.py        # Admin ingestion + CRUD
│       │   └── user.py         # User profile
│       ├── services/           # Business logic layer
│       │   ├── rag_pipeline.py     # Central RAG engine
│       │   ├── vector_service.py   # OpenSearch CRUD
│       │   ├── embedding_service.py# Titan embedding + chunking
│       │   ├── rerank_service.py   # Cohere reranking
│       │   ├── ocr_service.py      # Local Tesseract OCR
│       │   ├── dynamodb_service.py # DynamoDB CRUD
│       │   ├── chat_service.py     # Session management
│       │   ├── job_tracker.py      # Background job CRUD
│       │   ├── elevenlabs_service.py# TTS — English
│       │   ├── sarvamai_service.py # TTS — Hindi
│       │   ├── s3_service.py       # S3 upload/download
│       │   ├── draft_service.py    # Draft history
│       │   └── profile_service.py  # User profile
│       ├── ingestion/          # Document parsing adapters
│       │   ├── pdf_ingest.py   # Textract + OCR fallback
│       │   ├── image_ingest.py # Image OCR pipeline
│       │   └── web_ingest.py   # Web scraper pipeline
│       ├── core/               # Cross-cutting concerns
│       │   ├── auth.py         # Clerk JWT verification
│       │   ├── socket_manager.py# Socket.IO server
│       │   └── ocr_gatekeeper.py# Textract quota guard
│       └── prompts/            # System prompt templates
│           ├── system_prompt.txt   # Chat mode
│           ├── live_prompt.txt     # Live mode
│           ├── draft_phase.txt     # Live → drafting intent
│           └── draft_file.txt      # Document generation
│
├── docs/                       # Developer documentation
├── scripts/                    # Utility scripts
├── Dockerfile.backend          # Backend container
├── Dockerfile.frontend         # Frontend container
├── docker-compose.yml          # Production compose
├── docker-compose.dev.yml      # Development compose
└── .env.example                # Environment variable template
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- AWS credentials with Bedrock, OpenSearch, DynamoDB, S3 access
- Clerk account (publishable + secret key)

### 1. Clone the repo

```bash
git clone https://github.com/your-org/civicpulse.git
cd civicpulse
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_API_URL, Clerk keys
npm run dev          # http://localhost:3000
```

### 3. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp .env.example .env
# Fill in all AWS + third-party keys
uvicorn app.main:app --reload --port 8000
```

### 4. Docker (full stack)

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up --build
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_ADMIN_EMAILS="admin@example.com"
```

### Backend (`backend/.env`)

```env
# AWS Core
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1

# OpenSearch
OPENSEARCH_ENDPOINT=https://...
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=...
OPENSEARCH_INDEX=civicpulse

# S3
S3_BUCKET_NAME=civicpulse-docs

# AI Models
RAG_MODEL=anthropic.claude-3-haiku-20240307-v1:0
COHERE_API_KEY=...

# TTS
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
SARVAM_API_KEY=...

# STT
DEEPGRAM_API_KEY=...

# Auth
CLERK_SECRET_KEY=sk_...

# OCR
TEXTRACT_PAGE_LIMIT=1000    # Monthly Textract budget
```

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
vercel --prod
```

Set all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard.

### Backend → Render

1. Connect the GitHub repo to Render
2. Set **Dockerfile path** to `Dockerfile.backend`
3. Add all backend environment variables in Render's dashboard
4. Set `OCR_WORKER_URL` if running an external OCR worker

### Backend → Docker (self-hosted EC2)

```bash
docker build -f Dockerfile.backend -t civicpulse-backend .
docker run -p 8000:8000 --env-file backend/.env civicpulse-backend
```

---

## Contributing

1. Create a feature branch from `main`
2. Follow existing code style (Black for Python, ESLint + Prettier for TS)
3. Add tests in `backend/tests/` for new service logic
4. Open a pull request with a clear description

## License

MIT License — see [LICENSE](./LICENSE) for details.