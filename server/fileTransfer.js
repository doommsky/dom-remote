const transfers = new Map();
export function getTransfer(id) { return transfers.get(id); }
export function createTransfer(data) {
  if (transfers.has(data.transferId)) return null;
  const t = { ...data, state: 'awaiting_consent', receivedChunks: new Set(), createdAt: Date.now(), updatedAt: Date.now() };
  transfers.set(data.transferId, t);
  return t;
}
export function updateState(id, state) { const t = transfers.get(id); if (t) { t.state = state; t.updatedAt = Date.now(); } return t; }
export function addChunk(id, seq) { const t = transfers.get(id); if (!t) return false; if (t.receivedChunks.has(seq)) return 'duplicate'; if (seq !== t.receivedChunks.size) return 'out_of_order'; t.receivedChunks.add(seq); t.updatedAt = Date.now(); return 'ok'; }
export function cancelTransfer(id) { const t = transfers.get(id); if (t) { t.state = 'cancelled'; transfers.delete(id); } }
export function completeTransfer(id) { const t = transfers.get(id); if (t) { t.state = 'completed'; transfers.delete(id); } }
export function failTransfer(id) { const t = transfers.get(id); if (t) { t.state = 'failed'; transfers.delete(id); } }
export function removeTransfer(id) { transfers.delete(id); }
export function allTransfers() { return transfers; }
