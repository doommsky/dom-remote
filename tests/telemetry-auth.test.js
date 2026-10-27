import { describe, it, expect } from 'vitest';
import { authorizeTelemetry, throttleTelemetry } from '../server/telemetry.js';

describe('telemetry auth', () => {
  it('rejects telemetry request without an active session', () => {
    const session = { status: 'none' };
    expect(authorizeTelemetry(session, 'a', 'b')).toBe(false);
  });
  it('rejects telemetry request for a pending session', () => {
    const session = { status: 'pending', host_device_id: 'a', client_device_id: 'b' };
    expect(authorizeTelemetry(session, 'a', 'b')).toBe(false);
  });
  it('rejects telemetry request for an ended session', () => {
    const session = { status: 'ended', host_device_id: 'a', client_device_id: 'b' };
    expect(authorizeTelemetry(session, 'a', 'b')).toBe(false);
  });
  it('rejects telemetry request from an unauthorized participant', () => {
    const session = { status: 'active', host_device_id: 'a', client_device_id: 'b' };
    expect(authorizeTelemetry(session, 'x', 'b')).toBe(false);
  });
  it('throttles repeated telemetry updates from the same session', () => {
    const now = Date.now();
    expect(throttleTelemetry('s1', 'a', now)).toBe(true);
    expect(throttleTelemetry('s1', 'a', now + 10)).toBe(false);
  });
});
