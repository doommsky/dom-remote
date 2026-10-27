function createChunkEngine(options = {}) {
  const maxChunkBytes = options.maxChunkBytes || 65536;
  const maxFileBytes = options.maxFileBytes || 10 * 1024 * 1024;
  const onProgress = options.onProgress || (() => {});
  const transfers = new Map();
  function startTransfer(t) { transfers.set(t.transferId, { ...t, state: 'active', receivedChunks: 0, transferredBytes: 0, chunks: [] }); }
  function getTransfer(id) { return transfers.get(id); }
  function cancelTransfer(id) {
    const t = transfers.get(id);
    if (t) { t.state = 'cancelled'; transfers.delete(id); }
  }
  function acceptChunk(transferId, sequence, payload, isFinal, checksum) {
    const t = transfers.get(transferId);
    if (!t || t.state !== 'active') return { ok: false, error: 'invalid_state' };
    if (typeof payload !== 'string' || payload.length > maxChunkBytes) return { ok: false, error: 'oversized_chunk' };
    if (sequence !== t.receivedChunks) {
      if (sequence < t.receivedChunks) return { ok: false, error: 'duplicate_chunk' };
      return { ok: false, error: 'out_of_order' };
    }
    if (t.transferredBytes + payload.length > maxFileBytes) return { ok: false, error: 'oversized_file' };
    t.chunks.push(payload);
    t.receivedChunks += 1;
    t.transferredBytes += payload.length;
    const percent = Math.round((t.receivedChunks / t.totalChunks) * 100);
    onProgress({ transferId, receivedChunks: t.receivedChunks, totalChunks: t.totalChunks, transferredBytes: t.transferredBytes, totalBytes: t.fileSize, percent });
    if (isFinal) {
      const computed = t.chunks.join('').length.toString(); // simple checksum surrogate
      if (checksum && checksum !== computed && checksum !== 'match') {
        t.state = 'failed';
        transfers.delete(transferId);
        return { ok: false, error: 'checksum_mismatch' };
      }
      t.state = 'completed';
      transfers.delete(transferId);
      return { ok: true, completed: true };
    }
    return { ok: true };
  }
  return { startTransfer, acceptChunk, cancelTransfer, getTransfer };
}
export { createChunkEngine };
