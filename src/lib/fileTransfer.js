export function createTransferRequest({ filename, size, mime, direction, totalChunks, checksum }) {
  return { transferId: 't_' + Date.now(), filename, size, mime, direction, totalChunks, checksum };
}
export function validateFilename(name) { return typeof name === 'string' && !name.includes('..') && !/[<>:"|?*]/.test(name); }
EOF