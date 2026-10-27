import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import WebSocket from '../server/node_modules/ws/index.js';

describe('ws relay cross-device', () => {
  let proc;
  const port = 3106;
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

  it('cross-device relay rejected', async () => {
    const { token } = await register('d' + Date.now() + '@t.com');
    const host = await regDevice(token, 'host');
    const viewer = await regDevice(token, 'viewer');
    const other = await regDevice(token, 'other');
    await fetch('http://localhost:' + port + '/api/devices/' + host.deviceId, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ remote_access_enabled: true }) });
    const wsHost = await connect(token, host.deviceId);
    const wsViewer = await connect(token, viewer.deviceId);
    const wsOther = await connect(token, other.deviceId);

    for (const t of ['offer', 'answer', 'ice-candidate']) {
      const msgs = [];
      wsViewer.on('message', (d) => msgs.push(JSON.parse(d.toString())));
      wsViewer.send(JSON.stringify({ type: t, targetDeviceId: other.deviceId, payload: { type: t } }));
      await new Promise((r) => setTimeout(r, 500));
      const se = msgs.find((m) => m.type === 'session_error');
      expect(se).toBeDefined();
      wsViewer.removeAllListeners('message');
    }
    wsHost.close(); wsViewer.close(); wsOther.close();
  });
});
