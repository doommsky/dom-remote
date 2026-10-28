import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';

describe('device deletion', () => {
  let proc;
  const port = 3190;
  beforeAll(async () => {
    proc = spawn('node', ['server/index.js'], {
      env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret-1234567890', NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
      cwd: process.cwd(), stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 2000));
  });
  afterAll(() => { if (proc) proc.kill(); });

  it('unauthenticated delete returns 401', async () => {
    const r = await fetch('http://localhost:' + port + '/api/devices/abc', { method: 'DELETE' });
    expect(r.status).toBe(401);
  });
});
