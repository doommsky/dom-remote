import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { open } from '../server/node_modules/sqlite/build/index.js';
import sqlite3 from '../server/node_modules/sqlite3/lib/sqlite3.js';

describe('device deletion', () => {
  let proc;
  const port = 3189;
  beforeAll(async () => {
    proc = spawn('node', ['server/index.js'], {
      env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret-1234567890', NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
      cwd: process.cwd(), stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 2000));
  });
  afterAll(() => { if (proc) proc.kill(); });

  async function register(email) {
    const r = await fetch('http://localhost:' + port + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123456' }) });
    return r.json();
  }
  async function regDevice(token, name) {
    const r = await fetch('http://localhost:' + port + '/api/devices/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ name, type: 'desktop', platform: 'test' }) });
    return r.json();
  }

  it('unauthenticated delete returns 401', async () => {
    const r = await fetch('http://localhost:' + port + '/api/devices/abc', { method: 'DELETE' });
    expect(r.status).toBe(401);
  });

  it('owner can delete own device', async () => {
    const { token } = await register('owner' + Date.now() + '@t.com');
    const d = await regDevice(token, 'dev1');
    const r = await fetch('http://localhost:' + port + '/api/devices/' + d.deviceId, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.success).toBe(true);
    const r2 = await fetch('http://localhost:' + port + '/api/devices/' + d.deviceId, { method: 'GET', headers: { Authorization: 'Bearer ' + token } });
    expect(r2.status).toBe(404);
  });

  it('cross-user delete returns 404', async () => {
    const u1 = await register('u1' + Date.now() + '@t.com');
    const u2 = await register('u2' + Date.now() + '@t.com');
    const d = await regDevice(u1.token, 'dev2');
    const r = await fetch('http://localhost:' + port + '/api/devices/' + d.deviceId, { method: 'DELETE', headers: { Authorization: 'Bearer ' + u2.token } });
    expect(r.status).toBe(404);
  });

  it('missing device returns 404', async () => {
    const { token } = await register('miss' + Date.now() + '@t.com');
    const r = await fetch('http://localhost:' + port + '/api/devices/nonexistent', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    expect(r.status).toBe(404);
  });

  it('invalid device id returns 404', async () => {
    const { token } = await register('inv' + Date.now() + '@t.com');
    const r = await fetch('http://localhost:' + port + '/api/devices/%00', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    expect([400, 404]).toContain(r.status);
  });

  it('deleting device cancels associated sessions', async () => {
    const { token } = await register('sess' + Date.now() + '@t.com');
    const a = await regDevice(token, 'host');
    const b = await regDevice(token, 'client');
    const db = await open({ filename: 'dom-os.db', driver: sqlite3.Database });
    const sessionId = 'sess-' + Date.now();
    await db.run('INSERT INTO sessions (id, host_device_id, client_device_id, started_at, status) VALUES (?, ?, ?, ?, ?)', [sessionId, a.deviceId, b.deviceId, Date.now(), 'active']);

    const r = await fetch('http://localhost:' + port + '/api/devices/' + a.deviceId, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    expect(r.status).toBe(200);

    const after = await db.get('SELECT status, ended_at FROM sessions WHERE id = ?', [sessionId]);
    expect(after.status).toBe('cancelled');
    expect(after.ended_at).not.toBeNull();

    const r2 = await fetch('http://localhost:' + port + '/api/devices/' + a.deviceId, { method: 'GET', headers: { Authorization: 'Bearer ' + token } });
    expect(r2.status).toBe(404);

    await db.close();
  });
});
