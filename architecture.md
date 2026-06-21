# CivicPulse: Architecture, Challenges, & Solutions (SDE Interview Guide)

This document outlines the core architectural challenges encountered while building CivicPulse and the engineering solutions implemented to resolve them. It serves as a guide for discussing the system design during software engineering interviews.

---

## 1. Challenge: Large Document Ingestion & Fault Tolerance
**The Problem:** 
Processing massive legal PDFs (100+ pages) synchronously leads to HTTP timeouts and blocks the frontend UI. Furthermore, relying solely on managed OCR APIs like AWS Textract introduces risks: hitting monthly quotas (1,000 pages free tier) or experiencing mid-process crashes resulting in data loss.

**The Solution:**
- **Decoupled Asynchronous Pipeline:** We implemented an event-driven architecture using DynamoDB (`CivicPulseJobs`) to track background ingestion. The Next.js frontend simply polls the job status, freeing up the client while FastAPI handles the heavy lifting in the background.


- **Fail-Safe OCR Hot-Swapping:** We built a proprietary parser adapter that monitors Textract. If Textract fails or quotas are exhausted, the system seamlessly hot-swaps to application-level native libraries running on the same instance. Specifically, it uses **`pdfplumber`** for extremely fast direct text extraction from digitally native PDFs. If a page contains an embedded image (scanned document), it falls back to **Tesseract OCR (`pytesseract`)** and **`pdf2image` (Poppler)** to extract text locally, ensuring zero interruption for the user without relying on third-party APIs.

- **S3 Intermediate Checkpointing:** Instead of holding massive extracted text strings in memory, the system writes intermediate progress to S3 (`checkpoints/{job_id}_extracted.txt`). If a job fails at page 90 of 100, it can resume without requiring the user to re-upload and re-process the entire document.

---

## 2. Challenge: Context Fragmentation in RAG (Retrieval-Augmented Generation)
**The Problem:** 
Large Language Models (LLMs) have strict token limits. To store entire legal books in a vector database (OpenSearch), they must be split into chunks. However, splitting text blindly often orphans sentences, causing the AI to lose critical legal context at the chunk boundaries.

**The Solution:**
- **Recursive Semantic Splitting:** We parse documents using logical boundaries (sentences/paragraphs) into 512-token chunks with an 80-token overlap, ensuring no sentence is cut in half.
- **Sequential Context Stitching (`chunk_index`):** Every vector stored in OpenSearch includes a `chunk_index` in its metadata. If a user asks a highly specific question and the AI retrieves `chunk 5`, the system can automatically fetch `chunk 4` and `chunk 6`. This provides the LLM with a continuous, seamless surrounding context instead of an isolated text fragment.

---

## 3. Challenge: Precision vs. Noise in Semantic Search
**The Problem:** 
Standard Vector Search (k-NN) is great at finding conceptually similar text, but it often struggles with exact keyword matching (e.g., specific law names or statute numbers). Passing irrelevant "noise" to the LLM results in legal hallucinations.

**The Solution:**
- **Two-Stage Retrieval Pipeline:**
  1. **Broad Recall:** The system queries OpenSearch to retrieve the Top 15 candidate chunks (expanding the net).
  2. **Precision Reranking:** We pass those 15 candidates through a **Cohere Multilingual Rerank** model. It re-scores the candidates based on deep semantic relevance to the specific question, filtering out the noise and returning the pristine Top 5 chunks to the LLM.
- **Hybrid Search Boosting:** We combined dense vector similarity with BM25-style keyword boosting. If a user's query contains a specific source name (e.g., "Wildlife Act"), OpenSearch mathematically boosts the relevance score of chunks originating from that specific document by 1.8x.

---

## 4. Challenge: Multi-Tenant Data Privacy (RBAC)
**The Problem:** 
The platform hosts both "Global" institutional knowledge (uploaded by admins) and "Private" user files. If not handled correctly at the database level, a vector search could accidentally return another user's private legal document as context for an unauthorized user's chat.

**The Solution:**
- **Cryptographic-Grade Isolation in OpenSearch:** We embedded strict isolation logic directly into the OpenSearch retrieval query. 
- Every chunk's metadata tracks its `source_type` ("global" or "private") and `uploaded_by` (the user ID).
- The vector search is wrapped in a mandatory boolean filter that ensures the engine only retrieves chunks where `source_type == global` OR (`source_type == private` AND `uploaded_by == current_user_id`). This ensures absolute mathematical isolation between tenants.

---

## 5. Challenge: Real-Time UI Responsiveness
**The Problem:** 
Legal reasoning prompts are dense (containing history, retrieved chunks, and instructions). Waiting for a full LLM response from AWS Bedrock can take 5-10+ seconds, making the app feel sluggish and unresponsive.

**The Solution:**
- **WebSocket Token Streaming:** We bypassed standard REST API constraints for the chat endpoint. By establishing a persistent WebSocket connection between Next.js and FastAPI, we receive "chunked" tokens incrementally directly from the Claude-3 model. The tokens are flushed to the frontend instantly, creating a typing effect that engages the user immediately.




# CivicPulse Database Design & Architecture

## Overview
The CivicPulse platform employs a modern, serverless, and highly scalable NoSQL and Vector database architecture tailored for AI/RAG (Retrieval-Augmented Generation) workloads. Instead of a traditional relational database, the system relies on **AWS DynamoDB** for fast transactional data and **AWS OpenSearch** for high-dimensional semantic search. 

This design ensures high availability, extremely low latency, and infinite scalability—perfect for handling intensive background OCR jobs and real-time AI chatting.

---

## 1. AWS DynamoDB (NoSQL Transactional Data)
DynamoDB acts as the primary data store for session tracking, user results, and asynchronous background processing states.

### Table: `CivicPulseResults`
- **Purpose**: Stores historical user queries, generated AI summaries, and analytics data for dashboard usage reporting.
- **Partition Key**: `doc_id` (String - UUID)
- **Key Attributes**:
  - `user_id` (String): Identifier for the user (or "anonymous").
  - `session_id` (String): Identifier tying queries to a specific chat session for context.
  - `Query` (String): The user's input/question.
  - `Summary` (String): The generated AI response.
  - `RiskScore` (String): AI-determined risk assessment (e.g., "High").
  - `Timestamp` (String): ISO 8601 formatted UTC timestamp.
  - `pages_processed` (Number): Tracks the total number of document pages extracted during an operation. Because services like AWS Textract charge per page, tracking this attribute is critical for calculating real-time billing costs, enforcing usage quotas, and conducting monthly audits across both direct chat interactions and background ingestion jobs.
  - `ocr_engine` (String): Records the specific extraction engine utilized (e.g., "Textract", "pdfplumber", "Tesseract"). This allows the system to analyze cost versus accuracy tradeoffs, calculate engine-specific usage stats, and debug the fallback mechanisms if a primary engine fails.
- **Access Patterns**:
  - Fast retrieval of chat and analysis history.
  - Aggregation of weekly/monthly system usage and query volume.

### Table: `CivicPulseJobs`
- **Purpose**: Acts as a resilient job tracker for the asynchronous document ingestion pipeline (handling large PDFs via AWS Textract without blocking the UI).
- **Partition Key**: `job_id` (String - Shortened UUID)
- **Key Attributes**:
  - `admin_id` (String): Enables per-admin isolation and security of ingestion jobs.
  - `file_key` (String): The S3 key of the uploaded file.
  - `ingest_type` (String): Document type (e.g., "pdf").
  - `status` (String): Job state ("running", "completed", "failed", "cancelled").
  - `progress` (Number): Percentage completion (0-100) for real-time frontend updates.
  - `detail` (Map): A flexible JSON object storing dynamic job execution metadata that doesn't require top-level indexing. Most importantly, it holds S3 keys for intermediate extraction checkpoints (saving progress to prevent data loss if a long-running extraction fails halfway), exact pages extracted metrics, and specific OCR engine performance stats.
- **Access Patterns**:
  - Frontend polling for live job stat us updates.
  - Tracking system load and monthly ingestion quotas.

---

## 2. AWS OpenSearch (Vector Database)
OpenSearch is the engine powering the core AI feature: Retrieval-Augmented Generation (RAG). It allows the system to perform blazing-fast semantic searches across thousands of legal/civic documents.

### Index: `civicpulse`
- **Configuration**:
  - **Algorithm**: HNSW (Hierarchical Navigable Small World) for approximate nearest neighbor search.
  - **Engine**: Lucene.
  - **Vector Dimension**: `1536` (Optimized for standard AI embedding models like OpenAI's `text-embedding-ada-002` or AWS Titan).
  - **Distance Metric**: L2 (Euclidean distance).
- **Mapping & Schema**:
  - `vector` (`knn_vector`): The 1536-dimensional array representing the semantic meaning of the text chunk.
  - `metadata` (Object):
    - `text` (String): The actual chunk of document text.
    - `chunk_index` (Number): Because AI embedding models and LLMs have strict token limits, large documents must be split into smaller "chunks" (e.g., 500-1000 tokens) before being stored in OpenSearch. The `chunk_index` records the sequential order of these chunks (0, 1, 2...). During a RAG retrieval, if the AI finds chunk `5` highly relevant, the system can use `chunk_index` to easily fetch adjacent chunks (chunk `4` and `6`) to provide the LLM with seamless, continuous surrounding context instead of isolated, fragmented text.
    - `source` / `url` (String): The S3 key or origin URL of the document.
    - `source_type` (String): Access level—"global" (public) or "private" (user-specific).
    - `uploaded_by` (String): User ID mapping for private document access controls.
- **Search Capabilities**:
  - **Hybrid Search**: The system combines dense vector similarity (KNN) with BM25-style keyword boosting. If a user queries about a specific law, chunks matching that source URL/filename get a relevance multiplier (e.g., 1.8x boost), ensuring extreme precision.
  - **Role-Based Access Control (RBAC)**: Search queries automatically apply filters to exclude `private` documents unless the `uploaded_by` field matches the active `user_id`.

---

## 3. AWS S3 (Blob Storage / Data Lake)
While not a traditional database, S3 acts as the foundational data lake for the application.
- **Document Storage**: Raw PDFs, forms, and images uploaded for analysis are stored securely.
- **Extraction Checkpoints**: The massive text blobs extracted by AWS Textract are saved to `checkpoints/{job_id}_extracted.txt`. This prevents data loss during processing, keeps DynamoDB payloads small, and allows for resumable, fault-tolerant pipelines.

---


###  Chat Memory Architecture: Current vs. Future
1. Current Approach: "In-Memory Context Compression"
How it works: The database (get_item) fetches the entire array of chat messages in one network call.
The Slicing Logic: In Python, it slices the array to protect the LLM token limit.
Keeps the last 8 messages verbatim (Recent Window).
Keeps the last 7 user queries from older messages (Historical Summary).
Throws the rest out of RAM.
Pros: Extremely fast for normal-length conversations; keeps API costs very low.
2. The Architectural Challenge: The Scaling Flaw
The Problem: Storing an entire chat history as a single array inside one DynamoDB row breaks at massive scale.
Impact:
Bandwidth/RAM Spikes: Loading 1,000 messages into FastAPI memory just to slice off the last 15 is highly inefficient.
The 400KB Crash: AWS DynamoDB has a strict 400KB hard limit per row. If a user hits ~300-500 messages in one session, the database will throw a ValidationException and permanently break that chat session.
3. Future Implementations (Solutions)
Solution A: The Quick Fix (Soft Cap)

Add a simple logic check in the backend when appending a new message.
If len(messages) >= 100, stop the AI response and trigger a system warning to the frontend:
"This chat session has reached its memory limit to ensure optimal performance. Please start a new session to continue."

Why do this? It's a fast, 5-minute code change that completely protects the system from the 400KB DynamoDB crash.
Solution B: The Enterprise Fix (Schema Redesign)

Redesign the DynamoDB table so it doesn't use arrays. Instead, every single message is its own row.
Partition Key: SessionId
Sort Key: Timestamp
Why do this? You can now run a highly optimized database query with LIMIT 15 sorted backward by time. The database only sends 15 messages over the network, completely eliminating RAM spikes, bandwidth waste, and the 400KB limit forever.

## 💡 Architectural Highlights for Interview Showcase

When explaining this architecture in an interview, highlight the following engineering decisions:

1. **Serverless & Scalable**: By utilizing managed services (DynamoDB and OpenSearch), the architecture requires zero database server patching or maintenance and scales instantly with traffic spikes.
2. **Decoupled Asynchronous Processing**: The `CivicPulseJobs` table combined with S3 checkpoints enables a highly resilient background pipeline. The frontend is never blocked waiting for a 100-page PDF to be processed by Textract.
3. **Advanced RAG Implementation**: The OpenSearch implementation goes beyond a basic vector search. It implements **Hybrid Search (Vector + Source Boosting)** to ensure niche laws surface correctly, and strict **Metadata Filtering** to enforce user-level data privacy on private uploads.
