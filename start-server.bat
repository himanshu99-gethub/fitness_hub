@echo off
REM ============================================
REM FITNESS HUB - Email Server Starter
REM Windows Batch File
REM ============================================

title Fitness Hub Email OTP Server
color 0B

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║     🏋️  FITNESS HUB - EMAIL OTP SERVER                ║
echo ║            (Windows Startup Script)                   ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js is not installed!
    echo.
    echo Download Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version
echo.

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: NPM is not installed!
    pause
    exit /b 1
)

echo ✅ NPM found: 
npm --version
echo.

REM Check if .env file exists
if not exist .env (
    echo ⚠️  WARNING: .env file not found!
    echo.
    echo Please create .env file with your email credentials:
    echo   1. Copy .env.example to .env
    echo   2. Fill in GMAIL_USER and GMAIL_APP_PASSWORD
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)

echo ✅ .env file found
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
    echo.
)

REM Start the server
echo 🚀 Starting Fitness Hub Email Server...
echo.
echo ═══════════════════════════════════════════════════════
echo.

node server.js

if %errorlevel% neq 0 (
    echo.
    echo ═══════════════════════════════════════════════════════
    echo ❌ Server crashed with error code %errorlevel%
    echo.
    pause
    exit /b 1
)

pause
