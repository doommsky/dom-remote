import { describe, it, expect } from 'vitest';
import { expireStaleSessions } from '../server/sessionCleanup.js';
describe('session expiry', () => {
  it('exports expireStaleSessions function', () => { expect(typeof expireStaleSessions).toBe('function'); });
});
