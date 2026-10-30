import { describe, it, expect, vi } from 'vitest';

describe('observability', () => {
  it('sendSlackAlert no-ops when no webhook', async () => {
    const { sendSlackAlert } = await import('../server/observability.js');
    const res = await sendSlackAlert('hi');
    expect(res).toBe(false);
  });

  it('captureError does not throw', async () => {
    const { captureError } = await import('../server/observability.js');
    expect(() => captureError(new Error('boom'))).not.toThrow();
  });
});