import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import WebSocket from '../server/node_modules/ws/index.js';

describe('milestone scope', () => {
  let proc;
  const port = 3199;
  beforeAll(async () => {
    proc = spawn('node', ['server/index.js'], {
      env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret-1234567890', NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
      cwd: process.cwd(), stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 2000));
  });
  afterAll(() => { if (proc) proc.kill(); });

  async function setup() {
    const email = 'm' + Date.now() + '@t.com';
    const r = await fetch('http://localhost:' + port + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123456' }) });
    const { token } = await r.json();
    const d1 = await (await fetch('http://localhost:' + port + '/api/devices/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ name: 'host', type: 'desktop', platform: 'test' }) })).json();
    const d2 = await (await fetch('http://localhost:' + port + '/api/devices/register', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ name: 'viewer', type: 'desktop', platform: 'test' }) })).json();
    return { token, d1: d1.deviceId, d2: d2.deviceId };
  }

  async function connect(token, d1, d2) {
    const ws1 = new WebSocket('ws://localhost:' + port);
    const ws2 = new WebSocket('ws://localhost:' + port);
    await new Promise((res) => { let n=0; const done=()=>{n++; if(n===2) res();}; ws1.on('open',done); ws2.on('open',done); });
    ws1.send(JSON.stringify({ type: 'auth', token, deviceId: d1 }));
    ws2.send(JSON.stringify({ type: 'auth', token, deviceId: d2 }));
    await new Promise((r) => setTimeout(r, 500));
    return { ws1, ws2 };
  }

  it('telemetry denied without session', async () => {
    const { token, d1, d2 } = await setup();
    const { ws1, ws2 } = await connect(token, d1, d2);
    const msgs = []; ws2.on('message', (d) => msgs.push(JSON.parse(d.toString())));
    ws2.send(JSON.stringify({ type: 'telemetry', targetDeviceId: d1, payload: { cpu: 1 } }));
    await new Promise((r) => setTimeout(r, 1000));
    expect(msgs.find((m) => m.type === 'session_error')).toBeDefined();
    ws1.close(); ws2.close();
  });

  it('file transfer denied without session', async () => {
    const { token, d1, d2 } = await setup();
    const { ws1, ws2 } = await connect(token, d1, d2);
    const msgs = []; ws2.on('message', (d) => msgs.push(JSON.parse(d.toString())));
    ws2.send(JSON.stringify({ type: 'file_transfer', targetDeviceId: d1, payload: { path: '../secret', size: 10 } }));
    await new Promise((r) => setTimeout(r, 1000));
    const se = msgs.find((m) => m.type === 'session_error');
    expect(se).toBeDefined();
    ws1.close(); ws2.close();
  });
});
