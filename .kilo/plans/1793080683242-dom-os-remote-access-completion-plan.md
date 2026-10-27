# DOM OS Remote Access — Completion Plan

## Goal
Complete the existing `dom-remote` project into a functional, secure, cross-platform remote-access product (Windows host/controller, Android, iOS/iPadOS) with DOM OS UI fidelity, tested and packaged.

## Current State
- Stack: React 18 + Vite + Electron + Capacitor; Node/Express signaling server (port 3001); SQLite.
- UI: Home/Remote/Settings/AddDevice/History screens exist; design tokens updated to DOM OS palette.
- Transport: WebRTC signaling wired; screen capture via getDisplayMedia; no TURN/relay.
- Auth/device registry: functional (register/login/device register/pair).
- Tests: none automated. iOS project not present.

## Ordered Tasks
1. P0 Security & stability: add input validation, auth middleware hardening, secure token storage, env config docs.
2. P1 Backend: verify migrations, device pairing, session lifecycle, history persistence, rate limiting.
3. P2 Windows host: screen capture consent, reconnection, file transfer APIs, telemetry (CPU/RAM/GPU/disk/uptime), audit log.
4. P3 Transport: add TURN config, ICE failure handling, adaptive bitrate, session timeouts, cleanup.
5. P4 Android: build APK, test login/device list/connect, responsive layouts, permissions.
6. P5 iOS/iPadOS: scaffold Capacitor iOS, configure signing/build docs, document macOS/Xcode blocker.
7. P6 UI fidelity: implement DOM OS 3-column desktop layout, tablet/phone responsive, wire all controls (no inert buttons), remove mock telemetry.
8. P7 Testing: add unit/integration tests (auth, pairing, sessions, files, telemetry), run suites.
9. P8 Packaging: Windows installer, Android APK/AAB, verify artifacts, document release steps.

## Validation
- `npm run build` passes; `npm run electron:build` produces installer; `npm run capacitor:build:apk` produces APK.
- Signaling server starts; end-to-end connect between two browsers/devices.
- No plaintext secrets; all controls functional or documented limitation.

## Open Questions
- iOS build environment availability (macOS/Xcode)?
- TURN server provision?
- Target release signing credentials?
