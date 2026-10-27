import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import WebSocket from '../server/node_modules/ws/index.js';

describe('ws relay', () => {
  let proc;
  const port = 3102;
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

  it('rejects relay without approved session', async () => {
    const { token, userId } = await register('u' + Date.now() + '@t.com');
    const d1 = await regDevice(token, 'host');
    const d2 = await regDevice(token, 'viewer');
    const ws1 = new WebSocket('ws://localhost:' + port);
    const ws2 = new WebSocket('ws://localhost:' + port);
    await new Promise((res) => { let n=0; const done=()=>{n++; if(n===2) res();}; ws1.on('open',done); ws2.on('open',done); });
    ws1.send(JSON.stringify({ type: 'auth', token, deviceId: d1.deviceId }));
    ws2.send(JSON.stringify({ type: 'auth', token, deviceId: d2.deviceId }));
    await new Promise((r) => setTimeout(r, 500));
    const msgs = []; ws2.on('message', (d) => msgs.push(JSON.parse(d.toString())));
    ws2.send(JSON.stringify({ type: 'offer', targetDeviceId: d1.deviceId, payload: { type: 'offer' } }));
    await new Promise((r) => setTimeout(r, 1000));
    const se = msgs.find((m) => m.type === 'session_error');
    expect(se).toBeDefined();
    expect(se.error).toBe('No active approved session');
    ws1.close(); ws2.close();
  });
});


