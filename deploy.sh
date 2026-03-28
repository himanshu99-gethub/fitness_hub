#!/bin/bash
# Fitness Hub - Quick Deploy to Netlify & GitHub
# Run: chmod +x deploy.sh && ./deploy.sh

echo ""
echo "==============================================="
echo "🚀 Fitness Hub Deployment Script"
echo "==============================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    echo "Install from: https://git-scm.com/download/mac"
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Check if .git folder exists
if [ ! -d ".git" ]; then
    echo "📋 Initializing Git repository..."
    git init
    echo ""
fi

# Check if remote origin is set
if ! git remote get-url origin &> /dev/null; then
    echo ""
    echo "⚠️  Git remote not configured!"
    echo ""
    echo "Please run this command FIRST:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/fitness-hub.git"
    echo ""
    echo "Then run this script again."
    echo ""
    exit 1
fi

echo "📁 Checking for uncommitted changes..."
echo ""

echo "==============================================="
echo "📤 Pushing to GitHub..."
echo "==============================================="
echo ""

# Add all files
echo "Adding files to git..."
git add .

# Commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "Deployment update: $TIMESTAMP"

# Push to GitHub
git branch -M main 2>/dev/null
git push -u origin main

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Push to GitHub failed!"
    echo ""
    echo "Possible causes:"
    echo "1. Remote URL not configured correctly"
    echo "2. GitHub credentials not set up"
    echo "3. Network connection issue"
    echo ""
    echo "Solution:"
    echo "- Run: git remote set-url origin https://github.com/YOUR_USERNAME/fitness-hub.git"
    echo "- Or use GitHub Desktop for easier setup"
    echo ""
    exit 1
fi

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "==============================================="
echo "🌐 Next Steps - Deploy to Netlify"
echo "==============================================="
echo ""
echo "1. Go to: https://app.netlify.com/"
echo "2. Click: 'New site from Git'"
echo "3. Choose: GitHub"
echo "4. Select: YOUR_USERNAME/fitness-hub"
echo "5. Verify build settings:"
echo "   - Base directory: (empty)"
echo "   - Build: echo 'Static site, no build needed'"
echo "   - Publish: ."
echo "6. Add Environment Variables:"
echo "   - FIREBASE_DATABASE_URL"
echo "   - API_BASE_URL"
echo "7. Click: 'Deploy site'"
echo ""
echo "📋 Full guide: See NETLIFY_DEPLOYMENT_GUIDE.md"
echo ""
