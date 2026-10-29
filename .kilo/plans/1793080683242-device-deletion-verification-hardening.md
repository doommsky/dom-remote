# Device-Deletion Verification Hardening Plan

## Goal
Prove that `DELETE /api/devices/:id` securely deletes only the owner’s device, removes its database row, cancels associated sessions, and records an audit event, before starting token refresh/logout.

## Branch/Context
- Branch: `feature/p0-session-expiry`
- Device-deletion handler: `server/index.js:702-722`
- Existing tests: `tests/device-deletion.test.js` (4 tests, port 3189)
- Full suite baseline: 44 tests passing; latest 50/50.

## Corrected Assumptions
1. Session creation uses WebSocket `session_request` / `session_accept` flow, NOT `POST /api/sessions`.
2. `auditLog` writes structured JSON to stdout (`console.log`), not a DB/file. Capture requires stdout interception or is not safely testable.
3. `PORT=0` only works if server logs resolved port in parseable form. Current server logs `DOM-OS Signaling Server running on port ${PORT}`. Could parse, but retain fixed port 3189 unless needed.
4. SQLite foreign keys: no `PRAGMA foreign_keys = ON` found in initDatabase. Likely disabled; cancellation-first avoids orphaned active sessions but historical rows may remain.

## Code Skeptic Findings
1. Ownership enforced before deletion: `server/index.js:714` filters by `id AND user_id`.
2. Nonexistent/cross-user device returns 404 (`:715-717`).
3. Sessions cancelled before device row deleted (`:719` then `:720`).
4. Session update scoped to deleted device via `host_device_id OR client_device_id` (`:719`).
5. Audit emitted after successful deletion only (`:721`).
6. Foreign keys likely disabled; no PRAGMA found.
7. Fixed port 3189 collision risk under parallel execution.

## Implementation Tasks (Test Engineer; Code only if defect reproduced)
1. Strengthen owner-success: after deletion, re-issue DELETE and expect 404 (proves removal). Already added.
2. Add session-revocation test using WebSocket flow:
   - Create owner + two devices via HTTP.
   - Open WebSocket, authenticate both devices.
   - Send `session_request` from device A to device B, then `session_accept` from B.
   - Verify session status becomes `active`.
   - Delete device A via HTTP.
   - Assert session status becomes `cancelled` and `ended_at` non-null.
   - Assert re-delete returns 404.
   This requires WebSocket client in test (ws package available).
3. Add invalid/malformed device ID test: expect actual observed status (400/404).
4. Audit verification: capture stdout from spawned server process and assert `device_deleted` JSON appears after deletion. If stdout capture is unreliable, document limitation. Prefer documenting unless capture is straightforward.
5. Port isolation: retain 3189; document residual risk. Optionally parse resolved port if PORT=0 used; defer.
6. If reproduced defect (FK violation, ordering), apply minimal fix + regression test.

## Files to Inspect
- `server/index.js` initDatabase (foreign_keys) — line ~40-70
- `server/index.js` WebSocket `session_request`/`session_accept` handlers — ~270-300
- `auditLog` implementation — line 35
- `tests/device-deletion.test.js`

## Validation
- `npm test` 3 consecutive runs
- `npm run build`
- `git status` before/after
- No unrelated files modified.

## Out of Scope
- Token refresh/logout, telemetry UI, iOS, distributed rate limiter.
- No new audit framework, no dependency upgrades, no new HTTP endpoints for testing.

## Open Questions
- Can `ws` package be used in tests? Check package.json.
- Does the test harness support WebSocket client connections to spawned server?
- Audit stdout capture reliability.
