let ws = null;
const progressHandlers = [];
const completeHandlers = [];
const errorHandlers = [];
const cancelHandlers = [];
let state = 'idle';
let currentTransferId = null;

export function bindSocket(socket) { ws = socket; }
export function getState() { return state; }
export function onTransferProgress(h) { progressHandlers.push(h); }
export function onTransferComplete(h) { completeHandlers.push(h); }
export function onTransferError(h) { errorHandlers.push(h); }
export function onTransferCancelled(h) { cancelHandlers.push(h); }

export function startFileTransfer(meta) {
  state = 'requested';
  currentTransferId = meta.transferId;
  if (ws) ws.send(JSON.stringify({ type: 'file_transfer_request', ...meta }));
}

export function sendFileChunk(transferId, sequence, payload, isFinal, checksum) {
  if (state === 'cancelled' || state === 'completed' || state === 'failed') return false;
  if (ws) ws.send(JSON.stringify({ type: 'file_chunk', transferId, sequence, payload, isFinal, checksum }));
  return true;
}

export function cancelFileTransfer(transferId) {
  state = 'cancelled';
  if (ws) ws.send(JSON.stringify({ type: 'file_transfer_cancel', transferId }));
  currentTransferId = null;
}

export function handleServerMessage(msg) {
  if (msg.type === 'file_transfer_progress') {
    state = 'active';
    progressHandlers.forEach((h) => h(msg));
  }
  if (msg.type === 'file_transfer_complete') {
    state = 'completed';
    completeHandlers.forEach((h) => h(msg));
    currentTransferId = null;
  }
  if (msg.type === 'file_transfer_error') {
    state = 'failed';
    errorHandlers.forEach((h) => h(msg));
    currentTransferId = null;
  }
  if (msg.type === 'file_transfer_cancel') {
    state = 'cancelled';
    cancelHandlers.forEach((h) => h(msg));
    currentTransferId = null;
  }
}
