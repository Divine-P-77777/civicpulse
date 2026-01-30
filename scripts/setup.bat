@echo off
REM CivicPulse Development Setup Script for Windows

echo 🚀 Setting up CivicPulse development environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.11+ first.
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Copy environment file
if not exist .env (
    copy .env.example .env
    echo 📝 Created .env file from template. Please update with your configuration.
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
npm install
cd ..

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
python -m pip install -r requirements.txt
cd ..

REM Install root dependencies
echo 📦 Installing root dependencies...
npm install

echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update .env file with your configuration
echo 2. Run 'npm run dev' to start development servers
echo 3. Run 'npm run docker:dev' to start with Docker