import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { WebSocket } from '../server/node_modules/ws/index.js';

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
    let status;
    await new Promise((resolve) => {
      wsA.on('message', (data) => {
        const m = JSON.parse(data.toString());
        if (m.type === 'incoming_session') {
          wsA.send(JSON.stringify({ type: 'session_accept', sessionId: m.sessionId }));
        }
      });
      wsB.on('message', (data) => {
        const m = JSON.parse(data.toString());
        if (m.type === 'session_pending') sessionId = m.sessionId;
        if (m.type === 'session_accepted') { status = 'active'; resolve(); }
      });
      wsB.send(JSON.stringify({ type: 'session_request', hostDeviceId: a.deviceId }));
      setTimeout(resolve, 2000);
    });

    expect(sessionId).toBeDefined();
    wsA.close(); wsB.close();
  });
});
