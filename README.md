# CivicPulse - AI Legal Rights Assistant

CivicPulse is an AI-powered legal rights assistant designed to help users understand complex legal documents and civic rights through simple language explanations and actionable guidance.

## Features

- **Live Mode**: Real-time AI interaction with voice and camera capabilities
- **Chat Mode**: Document analysis and follow-up discussions
- **Multi-language Support**: English, Hindi, and regional Indian languages
- **Risk Assessment**: Traffic light system for legal clause classification
- **Document Generation**: Professional legal letters and complaints

## Architecture

- **Frontend**: Next.js 14 with React, Redux, TypeScript
- **Backend**: FastAPI with Python 3.11+
- **AI Integration**: OpenAI, Amazon Bedrock, Google Gemini
- **Database**: OpenSearch for vector storage / DynamoDB for session data
- **Storage**: Cloudinary for documents
- **Infrastructure**: Docker, AWS EC2, GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker and Docker Compose
- Git

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd civicpulse
```

2. Install dependencies:
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run with Docker Compose:
```bash
docker-compose up -dev
```

## Project Structure

```
civicpulse/
├── frontend/          # Next.js React application
├── backend/           # FastAPI Python application
├── docker/            # Docker configurations
├── .github/           # GitHub Actions workflows
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

## Contributing

Please read our contributing guidelines and code of conduct before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.