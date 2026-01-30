# Development Guide

## Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- Git

## Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd civicpulse
   
   # On Linux/Mac
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   
   # On Windows
   scripts/setup.bat
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Start development servers:**
   ```bash
   # Option 1: Using npm scripts
   npm run dev
   
   # Option 2: Using Docker
   npm run docker:dev
   ```

## Project Structure

```
civicpulse/
├── frontend/              # Next.js React application
│   ├── src/
│   │   ├── app/          # Next.js 14 app directory
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility libraries
│   │   ├── store/        # Redux store
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
├── backend/              # FastAPI Python application
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Core configuration
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   └── tests/            # Test files
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── .github/              # GitHub Actions workflows
```

## Development Workflow

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm test             # Run tests
```

### Backend Development

```bash
cd backend
uvicorn main:app --reload    # Start development server
python -m pytest            # Run tests
flake8 .                     # Run linting
mypy .                       # Run type checking
black .                      # Format code
```

### Docker Development

```bash
# Build and start all services
docker-compose -f docker-compose.dev.yml up --build

# Start specific service
docker-compose -f docker-compose.dev.yml up frontend
docker-compose -f docker-compose.dev.yml up backend

# View logs
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f backend
```

## Testing

### Frontend Testing
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright (to be added)
- **Type Checking**: TypeScript compiler

### Backend Testing
- **Unit Tests**: pytest
- **API Tests**: FastAPI TestClient
- **Property-Based Tests**: Hypothesis (for specific tasks)

## Code Quality

### Linting and Formatting
- **Frontend**: ESLint + Prettier
- **Backend**: Flake8 + Black + MyPy

### Pre-commit Hooks
```bash
# Install pre-commit (optional)
pip install pre-commit
pre-commit install
```

## Environment Variables

See `.env.example` for all required environment variables:

- **Database**: Supabase configuration
- **AI Services**: OpenAI, AWS, Google API keys
- **Storage**: Cloudinary configuration
- **Authentication**: JWT secret keys

## Debugging

### Frontend Debugging
- Use browser DevTools
- React DevTools extension
- Redux DevTools extension

### Backend Debugging
- Use FastAPI automatic docs at `/docs`
- Add breakpoints with `import pdb; pdb.set_trace()`
- Check logs in `backend/logs/` directory

## Common Issues

1. **Port conflicts**: Change ports in docker-compose files
2. **Permission errors**: Ensure proper file permissions on scripts
3. **API key errors**: Verify all environment variables are set
4. **Docker issues**: Try `docker system prune` to clean up

## Contributing

1. Create feature branch from `develop`
2. Make changes with tests
3. Run linting and tests
4. Submit pull request
5. Ensure CI passes