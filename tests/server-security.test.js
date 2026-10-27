import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';

describe('server security', () => {
  let proc;
  const port = 3101;
  beforeAll(async () => {
    proc = spawn('node', ['server/index.js'], {
      env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret-1234567890', NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
      cwd: process.cwd(),
      stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 2000));
  });
  afterAll(() => { if (proc) proc.kill(); });

  it('health ok', async () => {
    const r = await fetch('http://localhost:' + port + '/api/health');
    expect(r.status).toBe(200);
  });

  it('unauth devices rejected', async () => {
    const r = await fetch('http://localhost:' + port + '/api/devices');
    expect(r.status).toBe(401);
  });

  it('invalid registration rejected', async () => {
    const r = await fetch('http://localhost:' + port + '/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad', password: 'short' })
    });
    expect(r.status).toBe(400);
  });

  it('oversized body rejected', async () => {
    const big = 'x'.repeat(2 * 1024 * 1024);
    const r = await fetch('http://localhost:' + port + '/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: big })
    });
    expect([400, 413]).toContain(r.status);
  });
});
