@echo off
REM Fitness Hub - Quick Deploy to Netlify & GitHub
REM Run this script to push to GitHub and deploy to Netlify

echo.
echo ===============================================
echo 🚀 Fitness Hub Deployment Script
echo ===============================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git is installed
echo.

REM Check if .git folder exists
if not exist ".git" (
    echo 📋 Initializing Git repository...
    git init
    echo.
)

REM Check if remote origin is set
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  Git remote not configured!
    echo.
    echo Please run this command FIRST:
    echo git remote add origin https://github.com/YOUR_USERNAME/fitness-hub.git
    echo.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo 📁 Checking for uncommitted changes...
git status --porcelain >nul 2>&1

echo.
echo ===============================================
echo 📤 Pushing to GitHub...
echo ===============================================
echo.

REM Add all files
echo Adding files to git...
git add .

REM Commit with timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a-%%b)
git commit -m "Deployment update: %mydate% %mytime%"

REM Push to GitHub
git branch -M main 2>nul
git push -u origin main

if errorlevel 1 (
    echo.
    echo ❌ Push to GitHub failed!
    echo.
    echo Possible causes:
    echo 1. Remote URL not configured correctly
    echo 2. GitHub credentials not set up
    echo 3. Network connection issue
    echo.
    echo Solution:
    echo - Run: git remote set-url origin https://github.com/YOUR_USERNAME/fitness-hub.git
    echo - Or use GitHub Desktop/VS Code for easier setup
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Successfully pushed to GitHub!
echo.
echo ===============================================
echo 🌐 Next Steps - Deploy to Netlify
echo ===============================================
echo.
echo 1. Go to: https://app.netlify.com/
echo 2. Click: "New site from Git"
echo 3. Choose: GitHub
echo 4. Select: YOUR_USERNAME/fitness-hub
echo 5. Verify build settings:
echo    - Base directory: (empty)
echo    - Build: echo 'Static site, no build needed'
echo    - Publish: .
echo 6. Add Environment Variables:
echo    - FIREBASE_DATABASE_URL
echo    - API_BASE_URL
echo 7. Click: "Deploy site"
echo.
echo 📋 Full guide: See NETLIFY_DEPLOYMENT_GUIDE.md
echo.
pause
