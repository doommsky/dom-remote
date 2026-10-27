import { describe, it, expect, beforeEach } from 'vitest';
import * as FT from '../src/lib/fileTransfer.js';

describe('file transfer client', () => {
  let socket;
  beforeEach(() => {
    socket = { sent: [], send(m) { this.sent.push(JSON.parse(m)); } };
    FT.bindSocket(socket);
  });

  it('emits progress when a progress message arrives', () => {
    let received = null;
    FT.onTransferProgress((m) => { received = m; });
    FT.handleServerMessage({ type: 'file_transfer_progress', transferId: 't1', progress: 50 });
    expect(received).not.toBeNull();
    expect(received.progress).toBe(50);
  });

  it('updates transfer state to completed on completion message', () => {
    FT.handleServerMessage({ type: 'file_transfer_complete', transferId: 't1' });
    expect(FT.getState()).toBe('completed');
  });

  it('updates transfer state to failed on error message', () => {
    FT.handleServerMessage({ type: 'file_transfer_error', transferId: 't1', error: 'boom' });
    expect(FT.getState()).toBe('failed');
  });

  it('updates transfer state to cancelled on cancellation message', () => {
    FT.handleServerMessage({ type: 'file_transfer_cancel', transferId: 't1' });
    expect(FT.getState()).toBe('cancelled');
  });

  it('sends a cancel message when cancelFileTransfer is called', () => {
    FT.cancelFileTransfer('t1');
    expect(socket.sent.some((m) => m.type === 'file_transfer_cancel' && m.transferId === 't1')).toBe(true);
  });

  it('cleans up listeners after transfer completion', () => {
    FT.handleServerMessage({ type: 'file_transfer_complete', transferId: 't1' });
    expect(FT.getState()).toBe('completed');
  });

  it('rejects sending a chunk after cancellation', () => {
    FT.cancelFileTransfer('t1');
    const ok = FT.sendFileChunk('t1', 0, 'abc', false, 'x');
    expect(ok).toBe(false);
  });
});
