@echo off
REM DOM Remote Build Script for Windows
REM Run this after installing Node.js and dependencies

echo ==========================================
echo DOM Remote - Build Script
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building web app...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Build complete!
echo ==========================================
echo.
echo To build Windows .exe:
echo   npm run electron:build
echo.
echo To build Android .apk:
echo   npm run capacitor:build:apk
echo.
echo Note: For Android build, you need:
echo   - Java JDK 17+
echo   - Android Studio with SDK
echo   - ANDROID_HOME environment variable set
echo.
pause