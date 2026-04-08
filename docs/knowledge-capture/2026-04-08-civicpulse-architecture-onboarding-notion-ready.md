# CivicPulse Architecture And Onboarding Guide

## Capture Summary

- **Source date**: 2026-04-08
- **Source**: Codebase analysis in `c:\civicpulse`
- **Requested outcome**: Create a detailed Notion-ready document that helps new developers understand the project from architecture, user, frontend, backend, and infrastructure perspectives
- **Scope covered**: Runtime architecture, major user journeys, core services, data flow, storage, auth, AI pipeline, ingestion pipeline, deployment wiring, and onboarding notes
- **Important constraint**: This document is based on the current repository state. No product code was changed to produce it.

## Suggested Notion Page

### Recommended title

`CivicPulse: Architecture, User Flows, Backend Design, And Developer Onboarding`

### Suggested properties

| Property | Value |
|----------|-------|
| Title | CivicPulse: Architecture, User Flows, Backend Design, And Developer Onboarding |
| Type | Technical Documentation |
| Category | Architecture |
| Tags | civicpulse, architecture, onboarding, frontend, backend, ai, rag |
| Status | Draft |
| Audience | New Developers, Product Engineers, Technical Leads |
| Last Reviewed | 2026-04-08 |

## Suggested page body

```markdown
# CivicPulse: Architecture, User Flows, Backend Design, And Developer Onboarding

## 1. What CivicPulse Is

CivicPulse is an AI-powered legal assistance platform focused on making legal and civic rights easier to understand. It is designed around a few high-value user experiences:

- real-time live voice guidance for document understanding
- chat-based legal document analysis
- retrieval-augmented legal Q and A across uploaded and global knowledge sources
- AI-assisted legal draft generation
- admin-facing ingestion and operational control panels

The repository is effectively a monorepo with:

- a Next.js frontend in `frontend/`
- a FastAPI backend in `civicpulse-backend/`
- shared root docs and scripts in `docs/` and `scripts/`

Even though some older documentation refers to `backend/`, the active backend code currently lives in `civicpulse-backend/`.

## 2. Executive Architecture Summary

At a high level, CivicPulse works like this:

1. Users authenticate with Clerk.
2. The frontend sends authenticated requests to the backend.
3. The backend stores chat, draft history, live sessions, and user profiles in DynamoDB.
4. Documents and images are uploaded to S3.
5. Ingestion pipelines extract text using Textract or local OCR fallback.
6. Extracted text is chunked, embedded with Amazon Titan, and stored in OpenSearch.
7. User questions are embedded, matched against OpenSearch, optionally reranked with Cohere, and sent into a Bedrock-hosted Claude prompt.
8. The answer is returned either as:
   - normal JSON
   - streamed SSE text
   - live audio via TTS for voice mode

In practice, CivicPulse is a hybrid of:

- a document ingestion system
- a retrieval system
- a legal-answer generation system
- a voice interaction system
- a draft-generation workflow
- an admin operations dashboard

## 3. Repository Map

### Top-level structure

- `frontend/`
  - Next.js app router application
- `civicpulse-backend/`
  - FastAPI backend and AI pipelines
- `docs/`
  - project documentation and knowledge-capture artifacts
- `scripts/`
  - setup and environment helper scripts
- `src/`
  - contains a small root-level legacy artifact and is not the main app source tree

### Important note for new developers

There is a small root `src/` folder with `src/hooks/useLiveAudio.ts`, but the active frontend application code is under `frontend/src/`. Treat the root `src/` folder as suspicious or legacy unless proven otherwise.

## 4. Product Surfaces From The User Perspective

### 4.1 Landing page

The landing page communicates CivicPulse in plain language:

- Live Mode for real-time voice and camera guidance
- Chat Analysis for uploaded documents and follow-up legal questions
- risk categorization using red/yellow/green framing
- support for English and Hindi with more languages planned
- strong privacy messaging

This positioning is implemented in `frontend/src/app/page.tsx`.

### 4.2 Chat Mode

Chat Mode is the main deep-analysis experience:

- the user signs in
- the user can create or open a session
- the user can upload a document
- the backend processes the document in the background
- the user asks legal questions
- answers stream back progressively
- sessions are saved and reloadable

Chat sessions also support:

- auto-generated titles
- sharing by share ID
- sidebar-based history navigation

Core frontend entry points:

- `frontend/src/app/chat/page.tsx`
- `frontend/src/hooks/useChat.ts`
- `frontend/src/app/chat/components/*`

Backend route:

- `civicpulse-backend/app/routes/chat.py`

### 4.3 Live Mode

Live Mode is a voice-first interaction flow built around a persistent WebSocket:

- the user connects with Clerk-authenticated WebSocket auth
- browser speech recognition or Deepgram captures speech
- the backend runs retrieval and generation
- the response is converted to audio via ElevenLabs or Sarvam
- audio is streamed back in chunks
- camera support allows live capture and upload of images or documents
- users can pivot into draft creation when the AI decides a structured legal draft is ready

This is the most interactive and stateful part of the system.

Core frontend pieces:

- `frontend/src/app/live/components/LiveMode.tsx`
- `frontend/src/hooks/useLiveWebSocket.ts`
- `frontend/src/hooks/useLiveAudio.ts`
- `frontend/src/hooks/useLiveCamera.ts`
- `frontend/src/hooks/useUpload.ts`

Backend route:

- `civicpulse-backend/app/routes/live.py`

### 4.4 Draft Creation

Draft creation is a separate workflow, but it is fed by both direct user intent and live/chat context:

- user chooses a draft type
- user enters topic and context
- optional user profile data personalizes the draft
- backend streams the generated legal document
- completed drafts are stored in DynamoDB history
- the user can copy or export the result as PDF

Frontend:

- `frontend/src/app/draftcreation/page.tsx`
- `frontend/src/app/draftcreation/hooks/useDraftGeneration.ts`

Backend:

- `civicpulse-backend/app/routes/drafts.py`
- `civicpulse-backend/app/services/draft_service.py`

### 4.5 Admin Panel

The admin panel is not just a dashboard. It is operational infrastructure for the knowledge base:

- ingest PDF, image, web, or raw text sources
- monitor ingestion jobs
- inspect vectors in OpenSearch
- inspect records in DynamoDB
- manage S3 files and tags
- cancel jobs and clean up partial artifacts

Frontend:

- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/admin/components/*`

Backend:

- `civicpulse-backend/app/routes/admin.py`

## 5. Frontend Architecture

## 5.1 Framework and routing

The frontend is a Next.js App Router application using React and TypeScript.

Key observations:

- app routes live in `frontend/src/app/`
- immersive experiences like `/chat`, `/live`, `/draftcreation`, `/admin`, and `/architecture` bypass the normal marketing navigation/footer chrome
- route protection is handled by Clerk middleware in `frontend/src/proxy.ts`
- `/api/*` is rewritten to the backend using `frontend/next.config.js`

### Major route groups

- `/`
  - marketing landing page
- `/chat`
  - session-based streamed legal Q and A
- `/live`
  - live audio and camera mode
- `/draftcreation`
  - legal draft generation workflow
- `/admin`
  - admin-only operational console
- `/architecture`
  - internal architecture visualization page

## 5.2 Authentication model

The runtime auth model is Clerk-first:

- frontend uses Clerk hooks such as `useUser`, `useAuth`, and `useClerk`
- protected pages are enforced in middleware
- backend validates Clerk JWTs against Clerk JWKS
- admin access is email allow-list based

Important nuance:

- the repo still contains Redux auth types and old-style auth slices, but the runtime system uses Clerk
- new developers should treat Clerk as the source of truth for auth decisions

## 5.3 State management

The frontend uses Redux Toolkit with persisted state for a narrow set of UI/auth concerns.

Store definition:

- `frontend/src/store/index.ts`

Persisted slices:

- `auth`
- `ui`

Other slices:

- `chat`
- `documents`
- `live`

Important nuance:

- some slices appear more generic or legacy than the currently active route implementations
- the main chat and live workflows rely heavily on local hook state rather than only Redux

## 5.4 Key custom hooks

### `useChat`

Responsible for:

- loading sessions
- loading session history
- creating sessions
- deleting sessions
- uploading files
- sending a streamed chat request
- accumulating SSE chunks into a live assistant response

This is the heart of chat mode orchestration on the frontend.

### `useLiveWebSocket`

Responsible for:

- opening authenticated WebSocket connection
- reconnect logic
- parsing backend message types
- TTFT measurement
- draft-ready tag handling
- ingestion progress events

### `useLiveAudio`

Responsible for:

- browser speech recognition fallback flow
- optional Deepgram streaming STT path
- audio queueing and playback
- send/interrupt behavior
- auto-submit timing
- language hot-swap logic

This hook contains a lot of the interaction intelligence for live mode.

### `useLiveCamera`

Responsible for:

- camera activation
- passive frame capture
- still photo review flow
- base64 frame serialization for backend capture

### `useUpload`

Responsible for:

- live-mode file upload
- auth token injection
- metadata packaging
- notifying the backend that ingestion is complete

## 5.5 UI and interaction design

The frontend is not a plain enterprise dashboard. It deliberately uses:

- animated landing page visuals
- immersive full-screen experiences
- strong motion design in live mode
- guided tours in live mode via Joyride
- responsive sidebars and floating nav
- PWA installation support through service worker registration

This means new frontend work should preserve the product's "polished assistant" feel rather than reducing it to plain CRUD screens.

## 6. Backend Architecture

## 6.1 Runtime entry point

The backend boots from:

- `civicpulse-backend/app/main.py`

It does the following:

- loads environment variables
- registers CORS
- mounts API routers under `/api`
- mounts Socket.IO separately under `/socket.io`
- ensures required DynamoDB tables exist on startup
- exposes root and health endpoints
- uses a global exception handler

## 6.2 Router overview

### `chat.py`

Handles:

- chat session creation/listing/fetch/delete
- title updates
- synchronous and streamed chat responses
- document upload for user-side ingestion
- shared session links

### `live.py`

Handles:

- WebSocket lifecycle
- session setup
- greeting logic
- voice turn processing
- audio transcript and TTS streaming
- live ingestion status bridging
- explicit session cleanup

### `drafts.py`

Handles:

- draft session creation
- streaming draft generation
- draft history fetch/delete

### `user.py`

Handles:

- user profile fetch
- user profile save

### `admin.py`

Handles:

- admin ingestion
- job tracking
- vector CRUD
- DynamoDB record inspection
- S3 inspection and deletion
- tag syncing into vectors

### Other routes

- `upload.py`
  - a simpler upload route
- `analyze.py`
  - an older or more generic analysis route

For onboarding, `chat.py`, `live.py`, `drafts.py`, `user.py`, and `admin.py` are the most important.

## 6.3 Core backend building blocks

### Auth

`civicpulse-backend/app/core/auth.py`

Responsibilities:

- fetch Clerk JWKS with cache
- validate JWT issuer and signature
- expose current-user dependency
- expose admin-user dependency via email allow-list

### RAG pipeline

`civicpulse-backend/app/services/rag_pipeline.py`

This is the central intelligence layer. It:

- detects language
- detects draft intent in live/chat flows
- builds conversation context with truncation
- generates embeddings
- retrieves candidate chunks from OpenSearch
- optionally reranks with Cohere
- builds mode-specific prompts
- injects user profile context for drafts
- calls Bedrock for either streaming or non-streaming output

Modes:

- `live`
- `chat`
- `draft`

Each mode has different:

- `top_k`
- chunk size policy
- max token budget

This service is the best single file for understanding CivicPulse's actual product logic.

### Vector service

`civicpulse-backend/app/services/vector_service.py`

Responsibilities:

- OpenSearch client setup
- vector storage
- bulk vector storage
- similarity search with source filtering
- delete by source
- metadata updates
- index statistics

This layer is especially important because CivicPulse combines:

- global corpus retrieval
- private user-upload retrieval
- backward-compatible handling for older documents missing `source_type`

### Embedding service

`civicpulse-backend/app/services/embedding_service.py`

Responsibilities:

- chunk text
- generate single query embeddings
- generate ingestion embeddings in parallel
- throttle background embedding load to protect interactive traffic

This service exists to protect responsiveness for chat/live users even while ingestion is running.

### Storage services

- `s3_service.py`
  - S3 upload, tag management, listing, presigned URLs, delete
- `chat_service.py`
  - DynamoDB-backed chat session store
- `draft_service.py`
  - DynamoDB-backed draft history
- `profile_service.py`
  - DynamoDB-backed user profile data
- `live_session_service.py`
  - isolated DynamoDB store for transient live sessions with TTL
- `dynamodb_service.py`
  - analysis result logging and admin metrics

### OCR and extraction

- `ocr_gatekeeper.py`
  - chooses Textract vs local OCR based on monthly usage threshold or forced override
- `ocr_service.py`
  - local OCR using pdfplumber, pdf2image, and pytesseract
- `textract_service.py`
  - AWS Textract integration

### Ingestion orchestrators

- `app/ingestion/pdf_ingest.py`
- `app/ingestion/image_ingest.py`
- `app/ingestion/web_ingest.py`
- `app/services/ingestion_service.py`

These files coordinate extraction, chunking, embeddings, progress reporting, checkpoints, and bulk storage.

## 7. Data And Storage Architecture

## 7.1 DynamoDB tables

The project uses multiple DynamoDB tables with distinct roles.

### `CivicPulseChats`

Stores:

- user chat sessions
- messages
- titles
- timestamps
- share IDs

### `CivicPulseDrafts`

Stores:

- generated draft history by user
- draft type and topic
- generated content

### `CivicPulseUserProfiles`

Stores:

- personal details used for draft autofill
- optional metadata for personalization filters

### `CivicPulseLiveSessions`

Stores:

- one active live session document per WebSocket session
- sliding-window live conversation history
- language state
- TTL for leak protection

### `CivicPulseResults`

Stores:

- analysis summaries
- usage logging
- OCR engine metadata
- admin dashboard consumption data

### `CivicPulseJobs`

Managed through the job tracker service for ingestion lifecycle tracking.

Stores:

- running/completed/cancelled ingestion jobs
- progress
- detail metadata
- extraction checkpoint info

## 7.2 S3

S3 is the file ingress and artifact storage layer.

Used for:

- uploaded user documents
- uploaded admin ingestion files
- downloaded PDF URL ingestion content
- extraction checkpoint persistence

Files are typically stored under `uploads/` with generated UUID-based names.

## 7.3 OpenSearch

OpenSearch is the retrieval layer.

Stored document shape:

- vector embedding
- metadata including text, source, type, chunk index, and source_type

Search behavior includes:

- global corpus retrieval
- private user retrieval when `uploaded_by` matches the current user
- optional region/type filtering
- compatibility handling for older records

## 8. AI And Retrieval Pipeline

## 8.1 Chat and live answer flow

The typical retrieval path is:

1. receive user query
2. detect language
3. build a trimmed conversation context string
4. generate embedding with Amazon Titan
5. search OpenSearch for similar chunks
6. rerank results with Cohere when enabled
7. build prompt from:
   - retrieved context
   - conversation context
   - current query
   - optional profile context
8. call Claude on Bedrock
9. return streamed or non-streamed output
10. store the final output to DynamoDB result logging

## 8.2 Mode-aware behavior

The system does not treat all interactions equally.

### Live mode

- lower `top_k`
- smaller chunk char window
- shorter max token budget
- junk/noise query bypass
- TTS-friendly language constraints

### Chat mode

- medium retrieval size
- streamed SSE responses
- session history continuity

### Draft mode

- larger retrieval size
- more tokens
- draft prompt template
- optional profile injection

## 8.3 Prompt strategy

Prompt templates are stored in:

- `civicpulse-backend/app/prompts/system_prompt.txt`
- `civicpulse-backend/app/prompts/live_prompt.txt`
- `civicpulse-backend/app/prompts/draft_phase.txt`
- `civicpulse-backend/app/prompts/draft_file.txt`

This is important because CivicPulse behavior is shaped not only by code, but by prompt mode selection.

## 8.4 Language strategy

The app is strongly bilingual today:

- English
- Hindi

Language handling includes:

- frontend language toggles
- backend detection heuristics
- Devanagari detection
- Hinglish heuristics
- LLM fallback for ambiguous input
- strict prompt override rules to avoid language inertia from previous turns

For new developers, this means language state is not cosmetic. It is a first-class runtime concern.

## 9. Ingestion Architecture

## 9.1 Why ingestion matters

The quality of CivicPulse answers depends on ingestion quality. This is not a side utility. It is one of the platform's core subsystems.

## 9.2 PDF ingestion flow

For a PDF, the path is:

1. upload to S3
2. create job tracker record
3. choose OCR strategy using `ocr_gatekeeper`
4. extract text via:
   - AWS Textract, or
   - local OCR fallback
5. save extraction checkpoint
6. chunk text
7. generate embeddings in batches
8. bulk store vectors in OpenSearch
9. emit progress to admin/live clients
10. persist completion metadata

Notable design choices:

- cancellation support
- checkpoint recovery
- memory cleanup with `gc.collect()`
- semaphore protection for heavy ingestion tasks

## 9.3 Image ingestion flow

The image pipeline is similar but optimized for single-image OCR:

- download image from S3
- choose Textract or local OCR
- extract text
- chunk
- embed
- bulk store
- optionally notify live mode that the image is ready

## 9.4 Web ingestion flow

The web ingestor:

- fetches URLs using `curl_cffi` with browser impersonation
- handles some anti-bot edge cases better than plain requests
- strips boilerplate HTML
- extracts text
- chunks, embeds, and stores the result

This is a good example of CivicPulse being pragmatic about real-world ingestion rather than assuming all sources are clean.

## 10. Live Mode Deep Dive

Live mode deserves separate attention because it has the most moving parts.

### Frontend live flow

1. user opens `/live`
2. frontend creates a client session ID
3. frontend gets Clerk token
4. frontend opens WebSocket to `/api/live/ws/{session_id}?token=...`
5. frontend starts STT
6. user speech is accumulated and sent as text
7. backend processes the turn
8. backend sends:
   - transcript events
   - audio chunk events
   - speaking done markers
   - language switch events
   - draft ready markers
9. frontend plays audio and updates UI

### Backend live flow

1. verify Clerk token from WebSocket query param
2. create isolated live session record in DynamoDB
3. on user text:
   - possibly auto-switch language
   - load recent session history
   - run RAG
   - stream TTS
   - persist turn history
4. on session end:
   - delete live session immediately

### Important implementation detail

Live mode uses `<DRAFT_READY ... />` tags embedded in model output to signal draft handoff. The frontend validates this payload before surfacing the draft CTA. This is an elegant but subtle cross-layer contract that new developers need to understand before changing live or drafting behavior.

## 11. Drafting Deep Dive

Drafting has two personalities:

- direct drafting from user-entered topic/context
- derived drafting from live/chat conversations

The backend reuses the general RAG pipeline in `mode="draft"` rather than maintaining a separate generation stack. That is a strong architectural choice because it keeps retrieval, prompting, storage, and auth patterns consistent across the product.

Personalization is injected from the user profile table when enabled, so the draft generator can prefill:

- full name
- address
- contact number
- email

This makes the profile system product-critical for drafting even though it is a small service.

## 12. Admin And Operations Perspective

From the backend perspective, the admin panel is the operational control plane.

It exists to answer questions like:

- what content is in the knowledge base?
- what is currently ingesting?
- how many chunks were generated?
- what data is stored in OpenSearch?
- what files exist in S3?
- what usage and OCR metrics are accumulating?

It also enforces several operational safety controls:

- job concurrency limits
- global running-job caps
- cancellation paths
- cleanup of vectors and files after cancellation
- progress broadcasting

This means new backend developers working on ingestion or knowledge sources should usually inspect admin behavior too, not just the user-facing upload flow.

## 13. Infrastructure And Deployment Perspective

## 13.1 Frontend deployment assumptions

The codebase assumes:

- a separate frontend deployment
- the backend reachable through `NEXT_PUBLIC_API_URL`
- Clerk on the frontend
- rewrites from `/api/*` to backend `/api/*`

## 13.2 Backend deployment assumptions

The backend assumes:

- AWS credentials are available
- Bedrock is reachable
- S3 is configured
- OpenSearch is configured
- Clerk issuer is configured
- optional Cohere and Deepgram integrations may be present

## 13.3 Docker

The repository includes:

- `docker-compose.yml`
- `docker-compose.dev.yml`
- `Dockerfile.frontend`
- `Dockerfile.backend`

Current documentation and compose naming are slightly inconsistent with the real folder layout. Developers should verify paths before relying on older setup instructions.

## 13.4 External services in play

- Clerk
- AWS Bedrock
- AWS Textract
- AWS S3
- DynamoDB
- OpenSearch
- Cohere
- ElevenLabs
- Sarvam
- Deepgram

This is a service-rich architecture, so local development quality is heavily dependent on environment setup.

## 14. Developer Onboarding Guide

## 14.1 Best first mental model

A new developer should think of CivicPulse as five systems sharing one product:

1. marketing and auth shell
2. chat product
3. live voice product
4. draft generation product
5. ingestion and admin platform

If you only look at one of these, the system can feel confusing. The repo makes much more sense when viewed as a platform with multiple AI experiences built on the same storage and retrieval core.

## 14.2 Where to start reading

If you have one hour:

1. `frontend/src/app/chat/page.tsx`
2. `frontend/src/hooks/useChat.ts`
3. `civicpulse-backend/app/routes/chat.py`
4. `civicpulse-backend/app/services/rag_pipeline.py`

If you have another hour:

1. `frontend/src/app/live/components/LiveMode.tsx`
2. `frontend/src/hooks/useLiveWebSocket.ts`
3. `frontend/src/hooks/useLiveAudio.ts`
4. `civicpulse-backend/app/routes/live.py`
5. `civicpulse-backend/app/services/live_session_service.py`

If you are working on ingestion:

1. `civicpulse-backend/app/routes/admin.py`
2. `civicpulse-backend/app/ingestion/pdf_ingest.py`
3. `civicpulse-backend/app/ingestion/image_ingest.py`
4. `civicpulse-backend/app/ingestion/web_ingest.py`
5. `civicpulse-backend/app/services/vector_service.py`
6. `civicpulse-backend/app/services/embedding_service.py`

## 14.3 Common gotchas

### Docs vs reality mismatch

Some docs still describe:

- `backend/` instead of `civicpulse-backend/`
- older setup commands that do not fully match the current tree

### Auth mismatch

Runtime auth is Clerk-based, but some Redux auth types and endpoints still exist in the frontend code. Not every type or slice reflects the current production flow.

### Legacy artifacts

- root-level `src/` appears non-primary
- some older generic slices may be less important than route-specific hooks

### Environment dependency

The app depends on many third-party integrations. A "frontend bug" may actually be:

- missing Clerk config
- bad Bedrock access
- OpenSearch auth issue
- missing Deepgram key
- Textract quota threshold behavior

### Multi-path language behavior

Language can be driven by:

- explicit frontend selection
- backend heuristics
- live mode auto-switch

New developers should not assume language is static throughout a session.

## 14.4 Safe extension patterns

When adding features:

- reuse existing route patterns under `/api`
- preserve mode-specific behavior in the RAG pipeline
- be careful when changing metadata shape used by OpenSearch filters
- understand whether a change affects global corpus, private uploads, or both
- test live mode separately from chat mode
- preserve streaming behavior where users expect progressive output

## 15. System Strengths

The current architecture has several strong qualities:

- clean separation between frontend and backend
- clear feature-based route structure
- strong multimodal product surface
- explicit mode-aware AI pipeline
- user-private plus global retrieval support
- fallback strategy for OCR
- admin control plane for ingestion operations
- transient live session isolation
- streaming-first interaction design

## 16. System Risks And Architectural Debt

A new developer should also understand the likely pressure points:

- documentation drift between repo structure and setup docs
- some stale Redux-era models alongside current Clerk auth
- broad service dependency footprint
- AI behavior embedded in prompts plus code contracts
- a lot of complexity concentrated in `rag_pipeline.py` and live hooks
- mixed operational concerns inside route/service layers

None of these make the architecture bad, but they do mean careful onboarding matters.

## 17. One-Sentence Summary

CivicPulse is a Clerk-authenticated, Next.js plus FastAPI legal-assistance platform whose core value comes from combining document ingestion, vector retrieval, Bedrock-based reasoning, multilingual chat/live experiences, and draft generation on top of AWS-backed storage and operational tooling.
```

## Notes For The Next Reviewer

- This capture is intentionally written so it can be pasted directly into Notion with minimal cleanup.
- If Notion integration is connected later, this page should live in the main technical documentation database, not the decision log.
- The best follow-up artifact would be a second page containing sequence diagrams for Chat Mode, Live Mode, and Ingestion.
