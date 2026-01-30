# CivicPulse AI Legal Assistant - Design Document

## 1. Overview

CivicPulse is an AI-powered legal assistant that helps users understand legal documents and get instant legal guidance through two simple interaction modes:

- **Live Mode**: Real-time voice and camera interaction
- **Chat Mode**: Document upload and text-based conversation

The system uses AI with a legal knowledge base to provide accurate, grounded responses in multiple languages.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend                                              │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │   Live Mode     │  │   Chat Mode     │                     │
│  │ Voice + Camera  │  │ Document Upload │                     │
│  └─────────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API                               │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI + Supabase Auth                                      │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │  Auth Service   │  │  File Handler   │                     │
│  └─────────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROCESSING LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │  OCR Service    │  │ Document Parser │                     │
│  │ (AWS Textract)  │  │                 │                     │
│  └─────────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   RAG Engine    │  │   LLM Service   │  │  Voice AI       │ │
│  │ (Legal Context) │  │ (OpenAI/Gemini) │  │ (ElevenLabs)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Risk Dashboard  │  │ Letter Generator│  │  Voice Output   │ │
│  │ (Red/Yellow/    │  │   (PDF/Email)   │  │                 │ │
│  │  Green)         │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Data Flow

### Simple User Journey

```
User Input → Authentication → Processing → AI Analysis → Response

1. User uploads document OR speaks/shows camera
2. System authenticates user
3. OCR extracts text (if needed)
4. AI analyzes with legal knowledge
5. System shows risk assessment + recommendations
```

### Knowledge Base Flow

```
Legal Sources → Web Scraping → Text Processing → Vector Database

Indian Laws → Chunking → Embeddings → Supabase Vector DB
Consumer Acts → Cleaning → Indexing → Search Ready
```

## 4. Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  GitHub Repository                                             │
│         │                                                      │
│         ▼                                                      │
│  GitHub Actions CI/CD                                          │
│         │                                                      │
│         ▼                                                      │
│  Docker Containers                                             │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │   Frontend      │  │    Backend      │                     │
│  │   Container     │  │   Container     │                     │
│  └─────────────────┘  └─────────────────┘                     │
│         │                       │                             │
│         └───────────────────────┘                             │
│                     │                                         │
│                     ▼                                         │
│              AWS EC2 Instance                                  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Core Components

### 5.1 Frontend (Next.js)

**Technology Stack:**
- Next.js 14 with App Router
- React 18 for UI components
- Redux Toolkit for state management
- i18next for multi-language support
- Supabase client for real-time features

**Key Features:**
- Live Mode interface (voice + camera)
- Chat Mode interface (document upload)
- Risk visualization dashboard
- Letter generation UI
- Multi-language support

### 5.2 Backend (FastAPI)

**Core Services:**
- Authentication with Supabase
- File upload handling
- Document processing orchestration
- AI service integration
- Real-time communication

**API Endpoints:**
```
POST /auth/login          - User authentication
POST /documents/upload    - Document upload
GET  /documents/{id}      - Get document analysis
POST /chat/message        - Send chat message
POST /live/voice          - Process voice input
POST /live/camera         - Process camera input
GET  /letters/{id}        - Generate legal letter
```

### 5.3 AI Integration

**RAG System:**
- Retrieves relevant legal context from knowledge base
- Uses vector similarity search
- Provides grounded legal references

**LLM Integration:**
- OpenAI GPT-4 (primary)
- Google Gemini (fallback)
- Generates responses using retrieved context
- Maintains conversation history

**Voice AI:**
- ElevenLabs for text-to-speech (primary)
- Google Voice API (fallback)
- Real-time audio processing
- Multi-language voice support

### 5.4 Storage Layer

**Supabase Database:**
- User accounts and sessions
- Document metadata
- Chat history
- Generated letters

**Cloudinary:**
- Document file storage
- Image processing
- CDN delivery

**Vector Database:**
- Legal knowledge embeddings
- Fast similarity search
- Indexed legal documents

## 6. Interaction Modes

### 6.1 Live Mode Flow

```
User Voice Input → Speech Recognition → AI Processing → Voice Response
     │
     ▼
Camera Capture → OCR → Document Analysis → Risk Assessment
```

**Features:**
- Real-time voice conversation
- Camera document capture
- Instant risk assessment
- Voice feedback
- Visual risk indicators

### 6.2 Chat Mode Flow

```
Document Upload → OCR Processing → Clause Analysis → Risk Dashboard
     │
     ▼
User Questions → AI Analysis → Detailed Responses → Letter Generation
```

**Features:**
- PDF/Image document upload
- Detailed clause analysis
- Interactive Q&A
- Professional letter generation
- Export options

## 7. Data Models

### User Management
```
User:
- id (UUID)
- email (string)
- preferred_language (string)
- created_at (timestamp)

Session:
- session_id (UUID)
- user_id (UUID)
- mode ('live' | 'chat')
- created_at (timestamp)
- context_data (JSON)
```

### Document Processing
```
Document:
- id (UUID)
- user_id (UUID)
- filename (string)
- file_url (string)
- extracted_text (text)
- processing_status (enum)
- risk_assessment (JSON)

Clause:
- id (UUID)
- document_id (UUID)
- text (text)
- risk_level ('red' | 'yellow' | 'green')
- explanation (text)
- recommendations (JSON)
```

### Legal Knowledge
```
LegalDocument:
- id (UUID)
- title (string)
- content (text)
- category (string)
- embedding_vector (array)

LegalReference:
- act_name (string)
- section (string)
- description (text)
- relevance_score (float)
```

## 8. Security & Privacy

### Authentication Flow
```
User Login → Supabase Auth → JWT Token → Session Management
     │
     ▼
Protected Routes → Token Validation → Access Control
```

**Security Features:**
- JWT-based authentication
- Role-based access control
- Encrypted data storage
- Secure file uploads
- Session timeout management

### Data Protection
- All user data encrypted at rest
- HTTPS for all communications
- File upload validation
- User data isolation
- GDPR compliance ready

## 9. Performance & Scalability

### Response Time Targets
- Document upload: < 5 seconds
- OCR processing: < 10 seconds
- AI response: < 3 seconds
- Voice processing: < 2 seconds

### Scaling Strategy
```
Load Balancer → Multiple Backend Instances → Database Pool
     │
     ▼
CDN → Static Assets → Fast Global Delivery
```

**Optimization:**
- Database connection pooling
- Redis caching for frequent queries
- CDN for static assets
- Horizontal scaling ready
- Background job processing

## 10. Error Handling

### Error Categories

**Document Processing Errors:**
- OCR failure → Retry with different settings
- Unsupported format → Clear error message
- File too large → Compression suggestion

**AI Service Errors:**
- API timeout → Fallback to cached response
- Rate limit → Queue request for retry
- Service unavailable → Switch to backup provider
- ElevenLabs failure → Switch to Google Voice API

**Network Errors:**
- Connection lost → Auto-reconnect
- Slow network → Reduce quality/features
- Offline mode → Cache for later sync
- Audio service failure → Fallback to text mode

### Recovery Mechanisms
```
Error Detected → Log Error → User Notification → Retry Logic → Fallback Option
```

## 11. Testing Strategy

### Unit Testing
- Component testing (React)
- API endpoint testing (FastAPI)
- Service layer testing
- Database integration testing

### Property-Based Testing
- Document processing pipeline
- Risk classification consistency
- Multi-language support
- Authentication flows
- Error recovery behavior

### End-to-End Testing
- Complete user workflows
- Live Mode functionality
- Chat Mode functionality
- Document upload and analysis
- Letter generation

## 12. Correctness Properties

**Property 1: Authentication Integrity**
All authenticated users must have secure sessions with proper access control.

**Property 2: Document Processing Pipeline**
OCR → Clause parsing → Risk detection must complete within time limits.

**Property 3: Context Preservation**
Conversation context must persist across Live and Chat modes.

**Property 4: RAG-Grounded Responses**
All AI responses must reference retrieved legal context when applicable.

**Property 5: Risk Classification**
Clauses must be classified as Red/Yellow/Green consistently.

**Property 6: Secure Data Handling**
All user data must be encrypted and access-controlled.

**Property 7: Multi-language Consistency**
UI and AI responses must respect user language preference.

**Property 8: Voice & Camera Processing**
Voice and images must be processed in real-time with fallbacks.

**Property 9: Letter Generation Quality**
Generated letters must be professional and editable.

**Property 10: Responsive Design**
UI must adapt across all device sizes.

**Property 11: Error Recovery**
System must fail gracefully with retry mechanisms.

**Property 12: Performance Under Load**
System must maintain responsiveness under concurrent usage.

## 13. Development Workflow

### Technology Choices
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: FastAPI, Python 3.11+
- **Database**: Supabase (PostgreSQL + Realtime)
- **Storage**: Cloudinary for files
- **AI**: OpenAI GPT-4, ElevenLabs + Google Voice API
- **Deployment**: Docker + AWS EC2
- **Testing**: Jest, Pytest, Hypothesis

### Project Structure
```
civicpulse/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── docs/             # Documentation
├── scripts/          # Setup and deployment scripts
└── docker-compose.yml # Local development
```

### Development Process
1. Requirements gathering
2. Design documentation
3. Component implementation
4. Unit and integration testing
5. Property-based testing
6. End-to-end testing
7. Deployment and monitoring

## 14. Conclusion

CivicPulse combines AI technology with legal expertise to create an accessible platform for legal guidance. The architecture prioritizes:

- **Simplicity**: Clear user flows and intuitive interfaces
- **Reliability**: Robust error handling and fallback mechanisms
- **Security**: Comprehensive data protection and access control
- **Scalability**: Horizontal scaling and performance optimization
- **Accessibility**: Multi-language support and voice/camera interaction

The system is designed to empower users with understandable legal guidance while maintaining high standards of accuracy and security.