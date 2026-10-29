import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { WebSocket } from '../server/node_modules/ws/index.js';
import { open } from '../server/node_modules/sqlite/build/index.js';
import sqlite3 from '../server/node_modules/sqlite3/lib/sqlite3.js';

describe('e2e stage A', () => {
  let proc;
  const port = 3111;
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
  async function enableRemote(token, deviceId) {
    await fetch('http://localhost:' + port + '/api/devices/' + deviceId, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ remote_access_enabled: true }) });
  }
  function connectWs(token, deviceId) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:' + port);
      ws.on('open', () => { ws.send(JSON.stringify({ type: 'auth', token, deviceId })); });
      ws.on('message', (data) => { const m = JSON.parse(data.toString()); if (m.type === 'auth_success') resolve(ws); });
      ws.on('error', reject);
    });
  }

  it('stage A: session becomes active', async () => {
    const { token } = await register('sa' + Date.now() + '@t.com');
    const a = await regDevice(token, 'host');
    const b = await regDevice(token, 'client');
    await enableRemote(token, a.deviceId);
    const wsA = await connectWs(token, a.deviceId);
    const wsB = await connectWs(token, b.deviceId);

    let sessionId;
    let pendingReceived = false;
    let incomingReceived = false;
    let acceptedReceived = false;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('session approval timeout')), 5000);
      wsA.on('message', (data) => {
        const m = JSON.parse(data.toString());
        if (m.type === 'incoming_session') { incomingReceived = true; wsA.send(JSON.stringify({ type: 'session_accept', sessionId: m.sessionId })); }
        if (m.type === 'session_accepted') { /* host side */ }
      });
      wsB.on('message', (data) => {
        const m = JSON.parse(data.toString());
        if (m.type === 'session_pending') { pendingReceived = true; sessionId = m.sessionId; }
        if (m.type === 'session_accepted') { acceptedReceived = true; clearTimeout(timeout); resolve(); }
      });
      wsB.send(JSON.stringify({ type: 'session_request', hostDeviceId: a.deviceId }));
    });

    expect(pendingReceived).toBe(true);
    expect(incomingReceived).toBe(true);
    expect(acceptedReceived).toBe(true);
    expect(sessionId).toBeDefined();

    const db = await open({ filename: 'dom-os.db', driver: sqlite3.Database });
    const row = await db.get('SELECT status, ended_at FROM sessions WHERE id = ?', [sessionId]);
    expect(row.status).toBe('active');
    expect(row.ended_at).toBeNull();
    await db.close();

    wsA.close(); wsB.close();
  });
});
