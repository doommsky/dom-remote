import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import WebSocket from '../server/node_modules/ws/index.js';

describe('ws relay third-party', () => {
  let proc;
  const port = 3105;
  beforeAll(async () => {
    proc = spawn('node', ['server/index.js'], {
      env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret-1234567890', NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
      cwd: process.cwd(), stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 2000));
  });
  afterAll(() => { if (proc) proc.kill(); });

  async function register(email) {
    const r = await fetch('http://localhost:' + port + '/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123456' })
    });
    return r.json();
  }
  async function regDevice(token, name) {
    const r = await fetch('http://localhost:' + port + '/api/devices/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ name, type: 'desktop', platform: 'test' })
    });
    return r.json();
  }
  function connect(token, deviceId) {
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:' + port);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'auth', token, deviceId }));
        const handler = (d) => {
          const m = JSON.parse(d.toString());
          if (m.type === 'auth_success') { ws.off('message', handler); resolve(ws); }
        };
        ws.on('message', handler);
      });
    });
  }
  function waitFor(ws, type, ms = 3000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout ' + type)), ms);
      const h = (d) => {
        const m = JSON.parse(d.toString());
        if (m.type === type) { clearTimeout(timer); ws.off('message', h); resolve(m); }
      };
      ws.on('message', h);
    });
  }

  it('third party cannot relay into session', async () => {
    const { token } = await register('c' + Date.now() + '@t.com');
    const host = await regDevice(token, 'host');
    const viewer = await regDevice(token, 'viewer');
    const third = await regDevice(token, 'third');
    await fetch('http://localhost:' + port + '/api/devices/' + host.deviceId, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ remote_access_enabled: true }) });
    const wsHost = await connect(token, host.deviceId);
    const wsViewer = await connect(token, viewer.deviceId);
    const wsThird = await connect(token, third.deviceId);

    wsViewer.send(JSON.stringify({ type: 'session_request', hostDeviceId: host.deviceId }));
    const incoming = await waitFor(wsHost, 'incoming_session');
    wsHost.send(JSON.stringify({ type: 'session_accept', sessionId: incoming.sessionId }));
    await waitFor(wsViewer, 'session_accepted');

    // third attempts offer into session
    const hostMsgs = [];
    wsHost.on('message', (d) => hostMsgs.push(JSON.parse(d.toString())));
    const thirdMsgs = [];
    wsThird.on('message', (d) => thirdMsgs.push(JSON.parse(d.toString())));
    wsThird.send(JSON.stringify({ type: 'offer', targetDeviceId: host.deviceId, payload: { type: 'offer' } }));
    await new Promise((r) => setTimeout(r, 800));
    const se = thirdMsgs.find((m) => m.type === 'session_error');
    expect(se).toBeDefined();
    expect(se.error).toBe('No active approved session');
    // host should not receive third's offer
    const thirdOffer = hostMsgs.find((m) => m.type === 'offer' && m.fromDeviceId === third.deviceId);
    expect(thirdOffer).toBeUndefined();

    wsHost.close(); wsViewer.close(); wsThird.close();
  });
});
