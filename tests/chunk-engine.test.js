import { describe, it, expect } from 'vitest';
import { createChunkEngine } from '../server/fileTransfer.js';

describe('chunk engine', () => {
  it('rejects a duplicate chunk sequence', () => {
    const e = createChunkEngine();
    e.startTransfer({ transferId: 't', totalChunks: 2, fileSize: 10 });
    e.acceptChunk('t', 0, 'abc', false);
    const r = e.acceptChunk('t', 0, 'abc', false);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('duplicate_chunk');
  });
  it('rejects an out-of-order chunk sequence', () => {
    const e = createChunkEngine();
    e.startTransfer({ transferId: 't', totalChunks: 2, fileSize: 10 });
    const r = e.acceptChunk('t', 1, 'abc', false);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('out_of_order');
  });
  it('emits progress after each accepted chunk', () => {
    let prog;
    const e = createChunkEngine({ onProgress: (p) => { prog = p; } });
    e.startTransfer({ transferId: 't', totalChunks: 2, fileSize: 10 });
    e.acceptChunk('t', 0, 'abc', false);
    expect(prog).toBeDefined();
    expect(prog.transferId).toBe('t');
    expect(prog.receivedChunks).toBe(1);
    expect(prog.totalChunks).toBe(2);
    expect(prog.transferredBytes).toBe(3);
    expect(prog.totalBytes).toBe(10);
    expect(prog.percent).toBe(50);
  });
  it('rejects chunks after cancellation', () => {
    const e = createChunkEngine();
    e.startTransfer({ transferId: 't', totalChunks: 2, fileSize: 10 });
    e.cancelTransfer('t');
    const r = e.acceptChunk('t', 0, 'abc', false);
    expect(r.ok).toBe(false);
  });
  it('cleans transfer state after cancellation', () => {
    const e = createChunkEngine();
    e.startTransfer({ transferId: 't', totalChunks: 2, fileSize: 10 });
    e.cancelTransfer('t');
    expect(e.getTransfer('t')).toBeUndefined();
  });
  it('rejects completion when checksum mismatches', () => {
    const e = createChunkEngine();
    e.startTransfer({ transferId: 't', totalChunks: 1, fileSize: 3 });
    const r = e.acceptChunk('t', 0, 'abc', true, 'wrong');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('checksum_mismatch');
  });
  it('completes transfer when checksum matches', () => {
    const e = createChunkEngine();
    e.startTransfer({ transferId: 't', totalChunks: 1, fileSize: 3 });
    const r = e.acceptChunk('t', 0, 'abc', true, 'match');
    expect(r.ok).toBe(true);
    expect(r.completed).toBe(true);
  });
});
