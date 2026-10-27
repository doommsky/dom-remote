# Server Auth, Devices, Sessions Audit

## 1. Current implemented behavior
- server/index.js: JWT_SECRET enforcement (line ~15).
- Register/login routes with rate limiting (lines ~394, 424).
- Device register/list/update/revoke (lines ~284-343).
- Sessions request/approve/reject/end (lines ~205-260).
- WebSocket origin check (line ~103), 1MB body limit (line 20).
- Audit logging for session_requested, session_approved, relay_denied (lines 232, 245, 186).
- Active approved session enforcement for offer/answer/ICE relay (lines 178-195).

## 2. Missing/incomplete
- Token refresh/logout not implemented.
- Session expiry cleanup not implemented.
- Device delete not implemented.
- Relay authorization for telemetry/file transfer needs tests.

## 3. Security risks
- P1: In-memory rate limiter single-instance.
- P2: JWT dev fallback.
- P2: Audit gaps for unauthorized relay.

## 4. Existing tests
- tests/server-security.test.js, ws-relay*.test.js, server-health.test.js, chunk-engine, telemetry-auth, file-transfer-client, file-transfer-ui.

## 5. Missing tests
- Explicit rejected/revoked/expired session-state tests.
- Token refresh/logout.
- Device delete.

## 6. Implementation plan
1. Add session expiry cleanup.
2. Add device delete.
3. Add token refresh/logout.
4. Add audit for unauthorized relay.
5. Add tests for above.

## 7. Definition of done
All auth/device/session endpoints tested, security controls intact, audit logging complete, no P0/P1 risks.
EOF