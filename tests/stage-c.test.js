import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { WebSocket } from '../server/node_modules/ws/index.js';

describe('e2e stage C', () => {
  let proc;
  const port = 3113;
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
  async function setupSession() {
    const { token } = await register('sc' + Date.now() + '@t.com');
    const a = await regDevice(token, 'host');
    const b = await regDevice(token, 'client');
    await enableRemote(token, a.deviceId);
    const wsA = await connectWs(token, a.deviceId);
    const wsB = await connectWs(token, b.deviceId);
    let sessionId;
    await new Promise((resolve) => {
      wsA.on('message', (data) => { console.log('A recv:', data.toString().slice(0,120));
        const m = JSON.parse(data.toString());
        if (m.type === 'incoming_session') wsA.send(JSON.stringify({ type: 'session_accept', sessionId: m.sessionId }));
      });
      wsB.on('message', (data) => { console.log('B recv:', data.toString().slice(0,120));
        const m = JSON.parse(data.toString());
        if (m.type === 'session_pending') sessionId = m.sessionId;
        if (m.type === 'session_accepted') resolve();
      });
      wsB.send(JSON.stringify({ type: 'session_request', hostDeviceId: a.deviceId }));
      setTimeout(resolve, 2000);
    });
    await new Promise((r) => setTimeout(r, 300));
    return { token, a, b, wsA, wsB, sessionId };
  }

  it('stage C: real file transfers end-to-end', async () => {
    const { a, b, wsA, wsB, sessionId } = await setupSession();
    const chunks = ['AAA', 'BBB', 'CCC'];
    const transferId = 'fc-' + Date.now();
    const received = [];
    const progress = [];
    const completes = [];
    wsA.on('message', (data) => { console.log('A recv:', data.toString().slice(0,120));
      const m = JSON.parse(data.toString());
      if (m.type === 'file_transfer_request') {
        wsA.send(JSON.stringify({ type: 'file_transfer_consent', transferId: m.transferId }));
      }
      if (m.type === 'file_chunk') received.push(m.sequence);
      if (m.type === 'file_transfer_progress') progress.push(m.progress);
      if (m.type === 'file_transfer_complete') completes.push(m.transferId);
    });
    wsB.on('message', (data) => { console.log('B recv:', data.toString().slice(0,120));
      const m = JSON.parse(data.toString());
      if (m.type === 'file_transfer_consent') {
        chunks.forEach((c, i) => {
          wsB.send(JSON.stringify({ type: 'file_chunk', transferId, sessionId, targetDeviceId: a.deviceId, sequence: i, totalChunks: chunks.length, payload: c, isFinal: i === chunks.length - 1, checksum: 'ok' }));
        });
      }
    });

    wsB.send(JSON.stringify({ type: 'file_transfer_request', transferId, sessionId, recipientDeviceId: a.deviceId, filename: 'f.bin', size: 9, totalChunks: chunks.length, checksum: 'ok' }));

    await new Promise((r) => setTimeout(r, 2000));
    expect(received).toEqual([0, 1, 2]);
    expect(progress.length).toBeGreaterThan(0);
    expect(completes).toContain(transferId);
    wsA.close(); wsB.close();
  });
});
