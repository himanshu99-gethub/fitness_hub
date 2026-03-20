#!/bin/bash

# ============================================
# FITNESS HUB - Email Server Starter
# Mac/Linux Shell Script
# ============================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     🏋️  FITNESS HUB - EMAIL OTP SERVER                ║"
echo "║            (Mac/Linux Startup Script)                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed!"
    echo ""
    echo "Download Node.js from: https://nodejs.org/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ ERROR: NPM is not installed!"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ NPM found: $(npm --version)"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo ""
    echo "Please create .env file with your email credentials:"
    echo "  1. Copy .env.example to .env"
    echo "  2. Fill in GMAIL_USER and GMAIL_APP_PASSWORD"
    echo "  3. Run this script again"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "✅ Dependencies installed"
    echo ""
fi

# Start the server
echo "🚀 Starting Fitness Hub Email Server..."
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

node server.js

if [ $? -ne 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "❌ Server crashed"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi
