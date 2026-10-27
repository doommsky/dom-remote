import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('server health', () => {
  let proc;
  let dbDir;
  const port = 3099;
  beforeAll(async () => {
    dbDir = mkdtempSync(join(tmpdir(), 'domos-'));
    proc = spawn('node', ['server/index.js'], {
      env: { ...process.env, PORT: String(port), JWT_SECRET: 'test-secret-1234567890', NODE_ENV: 'test', CORS_ORIGIN: 'http://localhost:5173' },
      cwd: process.cwd(),
      stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 2000));
  });
  afterAll(() => {
    if (proc) proc.kill();
    try { rmSync(dbDir, { recursive: true, force: true }); } catch {}
  });
  it('health endpoint responds', async () => {
    const res = await fetch('http://localhost:' + port + '/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
  it('unauthenticated device route rejected', async () => {
    const res = await fetch('http://localhost:' + port + '/api/devices');
    expect(res.status).toBe(401);
  });
});
