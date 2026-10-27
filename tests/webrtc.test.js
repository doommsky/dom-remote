import { describe, it, expect } from 'vitest';
import { ICE_SERVERS } from '../src/lib/webrtc.js';

describe('WebRTC ICE configuration', () => {
  it('uses a STUN server and does not enable TURN in the baseline', () => {
    expect(Array.isArray(ICE_SERVERS)).toBe(true);
    expect(ICE_SERVERS.length).toBeGreaterThan(0);
    const first = ICE_SERVERS[0];
    expect(first.urls).toBeDefined();
    const hasTurn = ICE_SERVERS.some((server) => String(server.urls).startsWith('turn:'));
    expect(hasTurn).toBe(false);
  });
});
