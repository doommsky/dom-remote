let ws = null;
const progressHandlers = [];
const completeHandlers = [];
const errorHandlers = [];
export function bindSocket(socket) { ws = socket; }
export function onTransferProgress(h) { progressHandlers.push(h); }
export function onTransferComplete(h) { completeHandlers.push(h); }
export function onTransferError(h) { errorHandlers.push(h); }
export function startFileTransfer(meta) {
  if (ws) ws.send(JSON.stringify({ type: 'file_transfer_request', ...meta }));
}
export function sendFileChunk(transferId, sequence, payload, isFinal, checksum) {
  if (ws) ws.send(JSON.stringify({ type: 'file_chunk', transferId, sequence, payload, isFinal, checksum }));
}
export function cancelFileTransfer(transferId) {
  if (ws) ws.send(JSON.stringify({ type: 'file_transfer_cancel', transferId }));
}
export function handleServerMessage(msg) {
  if (msg.type === 'file_transfer_progress') progressHandlers.forEach((h) => h(msg));
  if (msg.type === 'file_transfer_complete') completeHandlers.forEach((h) => h(msg));
  if (msg.type === 'file_transfer_error' || msg.type === 'file_transfer_cancel') errorHandlers.forEach((h) => h(msg));
}
EOF