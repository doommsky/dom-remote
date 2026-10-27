# DOM Remote - Premium Dark Remote Access App

A Windows laptop remote access application with a premium dark design system, packaged for both desktop (.exe) and Android tablet (.apk).

## Quick Start

### Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **For Android builds:**
   - Java JDK 17+
   - Android Studio with SDK
   - `ANDROID_HOME` environment variable set

### Installation

```bash
# Clone or navigate to project
cd dom-remote

# Install dependencies
npm install
```

### Development

```bash
# Start dev server (web)
npm run dev

# Start Electron dev (desktop)
npm run electron:dev
```

### Building

#### Windows .exe (Desktop Host)
```bash
npm run electron:build
```
Output: `dist-electron/` folder with installer

#### Android .apk (Tablet Client)
```bash
# First time only - add Android platform
npm run capacitor:add:android

# Build APK
npm run capacitor:build:apk
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### One-Command Build (Windows)
```bash
build-windows.bat
```

## Project Structure

```
dom-remote/
├── src/                    # React source code
│   ├── main.jsx           # Entry point
│   ├── App.jsx            # Main app component
│   └── styles.css         # Design system styles
├── electron/              # Electron configuration
│   ├── main.js            # Main process
│   └── preload.js         # Preload script
├── android/               # Android project (generated)
├── dist/                  # Web build output
├── dist-electron/         # Electron build output
├── assets/                # Icons, splash screens
├── package.json           # Dependencies & scripts
├── vite.config.js         # Vite bundler config
├── capacitor.config.ts    # Capacitor config
└── build-windows.bat      # Windows build script
```

## Architecture

- **Host (Desktop .exe)**: Runs on the laptop being accessed remotely
- **Client (Android .apk)**: Runs on the tablet controlling the remote session
- **Communication**: WebRTC / WebSocket (to be implemented)

## Design System

Premium Dark theme:
- Background: `#0B0D18` (deep navy)
- Surface: `#171B2A`
- Primary: `#7C3AED` (electric purple)
- Success: `#4ADE80` (online green)
- Muted: `#6B7280`
- Error: `#EF4444`

## Features

- [x] Home screen with laptop status
- [x] Remote desktop view with controls
- [x] Settings (Security, Display, About)
- [x] LocalStorage persistence
- [x] Electron desktop packaging
- [x] Capacitor Android packaging
- [ ] WebRTC remote desktop streaming
- [ ] Keyboard/mouse input forwarding
- [ ] Secure authentication
- [ ] Connection relay

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Electron** - Desktop packaging
- **Capacitor** - Android packaging
- **Electron Builder** - .exe installer creation

## License

MIT