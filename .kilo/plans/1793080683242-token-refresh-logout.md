# Token Refresh and Logout Slice Plan

## Goal
Add secure JWT token refresh and logout, preserving session/device security.

## Current state
- JWT only (generateToken/verifyToken), no refresh tokens, no logout endpoint.
- sessions table: id, host_device_id, client_device_id, started_at, ended_at, status.
- devices table: id, user_id, etc.
- Audit: auditLog() console JSON.
- Rate limiting in-memory.

## Implementation steps
1. Add refresh_tokens table (CREATE TABLE IF NOT EXISTS).
2. Add generateRefreshToken(userId, deviceId) -> raw token, store hash, 30-day expiry.
3. Add verifyRefreshToken(rawToken) -> {userId, deviceId} or null.
4. Modify login/register to return refresh token.
5. Add POST /api/auth/refresh: validate, rotate, audit.
6. Add POST /api/auth/logout: revoke session + refresh token, audit.
7. Tests: valid refresh, rotation reuse rejected, expired, revoked, invalid, missing, logout revokes, post-logout rejected, no secrets leaked.
8. Run npm test, build.

## Risks
- Schema change via CREATE TABLE IF NOT EXISTS (safe).
- Backward compat: clients without refresh token still work.
- Body-based refresh token (trade-off documented).

## Validation
- All existing tests + new tests pass.
- Build passes.
EOF