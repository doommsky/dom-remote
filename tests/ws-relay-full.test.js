import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import WebSocket from '../server/node_modules/ws/index.js';

describe('ws relay full', () => {
  let proc;
  const port = 3103;
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
  function collect(ws, ms = 500) {
    const msgs = [];
    const h = (d) => msgs.push(JSON.parse(d.toString()));
    ws.on('message', h);
    return new Promise((resolve) => { setTimeout(() => { ws.off('message', h); resolve(msgs); }, ms); });
  }

  it('rejects relay without approved session', async () => {
    const { token } = await register('a' + Date.now() + '@t.com');
    const d1 = await regDevice(token, 'host');
    const d2 = await regDevice(token, 'viewer');
    const ws1 = await connect(token, d1.deviceId);
    const ws2 = await connect(token, d2.deviceId);
    const msgs = [];
    ws2.on('message', (d) => msgs.push(JSON.parse(d.toString())));
    ws2.send(JSON.stringify({ type: 'offer', targetDeviceId: d1.deviceId, payload: { type: 'offer' } }));
    await new Promise((r) => setTimeout(r, 800));
    const se = msgs.find((m) => m.type === 'session_error');
    expect(se).toBeDefined();
    expect(se.error).toBe('No active approved session');
    ws1.close(); ws2.close();
  });
});
