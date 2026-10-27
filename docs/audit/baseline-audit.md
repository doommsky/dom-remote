# Baseline Audit - DOM OS Remote Access

## Executive baseline verdict
PROTOTYPE - NOT PRODUCTION-READY.

## Workspace and Git state
- Root: C:\Users\DOOM98\OpenWork Chat
- Branch: main
- Commit: 9be7d9fd
- Remotes: none (now pushed to doommsky/dom-remote)
- Modified: dist-electron artifacts, src/lib/webrtc.js (reverted)
- Untracked: .kilo/, REVIEW.md, diag scripts, dist-electron/win-unpacked

## Build versus runtime
- Builds: web (vite) PASS; electron installer PASS
- Starts: vite dev (5173), signaling server (3001)
- Runtime proof: none beyond manual runs
- Claimed only: auth security, signaling authz, WebRTC reliability, telemetry, file transfer
- Untested: all runtime features

## Server audit (server/index.js)
Routes: register(373-397), login(399-422), verify(424-437), device register(439-466), devices GET(468-482), device GET(484-502), device PATCH(504-541), device DELETE(543-562), health(564-566).
WebSocket types: auth(132-164), offer/answer/ice-candidate(166-185), session_request(187-216), session_accept(218-233), session_reject/session_end(235-262), get_devices(264-269), update_device(271-299), revoke_device(301-322), get_history(324-341), ping(343-346).
Database: SQLite dom-os.db, tables users/devices/sessions/connection_history, no migrations.
Security gaps: no rate limiting, no input validation beyond presence, CORS wide open (line 19), WS origin unchecked (line 91), JWT secret default hardcoded (line 15), no audit logging, no payload limit, offer/answer/ice relay lacks session approval enforcement.

## WebRTC audit (src/lib/webrtc.js)
ICE_SERVERS lines 4-8: STUN only, TURN commented. getDisplayMedia line 224. Peer connection 235-268. No ICE restart. Cleanup 331-349.

## Screen capture / consent
Client getDisplayMedia line 224; no host consent UI in App.jsx. Server session_accept requires host device (line 221) but no viewer approval identity check.

## UI audit
src/App.jsx single-column (max-width 600px/1000px). No 3-column 1648x922. Tokens updated. Missing reconnecting/permission-required states.

## Android
android/ exists; APK build not verified.

## iOS
No ios/ directory.

## Evidence matrix
| Area | Claimed | Verified | Evidence | Gap | Severity | Owner |
|---|---|---|---|---|---|---|
| Web build | pass | VERIFIED | npm run build | none | - | Code |
| Electron build | pass | VERIFIED | installer file | none | - | Code |
| Auth server | exists | PARTIALLY VERIFIED | server/index.js:373-422 | no validation/rate limit | P1 | Code |
| Signaling authz | exists | PARTIALLY VERIFIED | server/index.js:166-185 | no session approval check | P1 | Code |
| WebRTC | exists | PARTIALLY VERIFIED | src/lib/webrtc.js:202-374 | no TURN, no reconnect | P1 | Code |
| Screen capture | exists | PARTIALLY VERIFIED | src/lib/webrtc.js:224 | consent missing | P1 | Code |
| Tests | none | VERIFIED | no test files | need harness | P2 | Test |
| Android | exists | UNVERIFIED | android/ | APK not built | P2 | Code |
| iOS | missing | VERIFIED | no ios/ | scaffold needed | P2 | Code |
| 3-col UI | missing | VERIFIED | src/App.jsx | implement | P2 | Frontend |

## Blocking findings
1. Server input validation + rate limiting absent (P1)
2. No TURN relay (P1)
3. No session approval enforcement on signaling relay (P1)
4. No tests (P2)
5. No iOS project (P2)
6. No responsive 3-column UI (P2)

## First three PRs
1. docs/baseline-audit - branch docs/baseline-audit - this document - reviewer: Code Reviewer
2. chore/test-harness - branch chore/test-harness - add test runner + first tests - reviewer: Test Engineer
3. fix/server-input-validation - branch fix/server-input-validation - validation + rate limits + CORS/origin - reviewer: Code Reviewer

BASELINE AUDIT COMPLETE
