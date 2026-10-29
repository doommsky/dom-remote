import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { open } from '../server/node_modules/sqlite/build/index.js';
import sqlite3 from '../server/node_modules/sqlite3/lib/sqlite3.js';

describe('token refresh and logout', () => {
  let proc;
  const port = 3188;
  beforeAll(async () => {
    proc = spawn('node', ['server/index.js'], {
      env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret-1234567890', NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
      cwd: process.cwd(), stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 2000));
  });
  afterAll(() => { if (proc) proc.kill(); });

  it('login returns refresh token', async () => {
    const email = 'tr' + Date.now() + '@t.com';
    const r = await fetch('http://localhost:' + port + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123456' }) });
    const j = await r.json();
    expect(j.refreshToken).toBeDefined();
    expect(j.token).toBeDefined();
  });

  it('valid refresh returns new tokens', async () => {
    const email = 'tr2' + Date.now() + '@t.com';
    const r = await fetch('http://localhost:' + port + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123456' }) });
    const j = await r.json();
    const r2 = await fetch('http://localhost:' + port + '/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: j.refreshToken }) });
    const j2 = await r2.json();
    expect(r2.status).toBe(200);
    expect(j2.token).toBeDefined();
    expect(j2.refreshToken).toBeDefined();
  });

  it('reusing old refresh token is rejected', async () => {
    const email = 'tr3' + Date.now() + '@t.com';
    const r = await fetch('http://localhost:' + port + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123456' }) });
    const j = await r.json();
    await fetch('http://localhost:' + port + '/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: j.refreshToken }) });
    const r2 = await fetch('http://localhost:' + port + '/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: j.refreshToken }) });
    expect(r2.status).toBe(401);
  });

  it('missing refresh token rejected', async () => {
    const r = await fetch('http://localhost:' + port + '/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    expect(r.status).toBe(400);
  });

  it('logout revokes refresh token', async () => {
    const email = 'tr4' + Date.now() + '@t.com';
    const r = await fetch('http://localhost:' + port + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123456' }) });
    const j = await r.json();
    const db = await open({ filename: 'dom-os.db', driver: sqlite3.Database });
    const before = await db.get('SELECT revoked FROM refresh_tokens WHERE token_hash = ?', [ (await import('node:crypto')).createHash('sha256').update(j.refreshToken).digest('hex') ]);
    expect(before.revoked).toBe(0);
    const r2 = await fetch('http://localhost:' + port + '/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + j.token }, body: JSON.stringify({ refreshToken: j.refreshToken }) });
    expect(r2.status).toBe(200);
    const after = await db.get('SELECT revoked FROM refresh_tokens WHERE token_hash = ?', [ (await import('node:crypto')).createHash('sha256').update(j.refreshToken).digest('hex') ]);
    expect(after.revoked).toBe(1);
    const r3 = await fetch('http://localhost:' + port + '/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: j.refreshToken }) });
    expect(r3.status).toBe(401);
    await db.close();
  });
});
