import { describe, it, expect } from 'vitest';
import { sanitizeTelemetry } from '../src/lib/telemetry.js';

describe('telemetry sanitize', () => {
  it('allowlist removes unknown fields', () => {
    const out = sanitizeTelemetry({ cpu: 10, foo: 'bar', token: 'secret' });
    expect(out).toEqual({ cpu: 10 });
    expect(out.foo).toBeUndefined();
    expect(out.token).toBeUndefined();
  });
  it('sensitive fields removed', () => {
    const out = sanitizeTelemetry({ password: 'x', secret: 'y', cpu: 5 });
    expect(out).toEqual({ cpu: 5 });
  });
  it('invalid types sanitized', () => {
    const out = sanitizeTelemetry({ cpu: 'abc', platform: 123, processes: 'x' });
    expect(out.cpu).toBe(0);
    expect(out.platform).toBe('');
    expect(out.processes).toEqual([]);
  });
  it('non-object returns empty', () => {
    expect(sanitizeTelemetry(null)).toEqual({});
    expect(sanitizeTelemetry([1, 2])).toEqual({});
    expect(sanitizeTelemetry('str')).toEqual({});
  });
});
