import React, { useState, useEffect } from 'react';
import { onTransferProgress, onTransferComplete, onTransferError, onTransferCancelled, cancelFileTransfer } from '../../lib/fileTransfer.js';

export default function FileTransferPanel({ transferId, filename, size }) {
  const [status, setStatus] = useState('requested');
  const [progress, setProgress] = useState(0);
  const [transferred, setTransferred] = useState(0);
  const [total, setTotal] = useState(size || 0);
  const [error, setError] = useState('');

  useEffect(() => {
    onTransferProgress((m) => { setStatus('active'); setProgress(m.percent || 0); setTransferred(m.transferredBytes || 0); setTotal(m.totalBytes || size || 0); });
    onTransferComplete(() => { setStatus('completed'); setProgress(100); });
    onTransferError((m) => { setStatus('failed'); setError(m.error || 'Transfer failed'); });
    onTransferCancelled(() => { setStatus('cancelled'); });
  }, [size]);

  const active = status === 'active' || status === 'awaiting_consent' || status === 'requested';
  return (
    <section>
      <h3>File Transfer</h3>
      <div>File: {filename} ({size} bytes)</div>
      <div>Status: {status}</div>
      <progress value={progress} max={100} />
      <div>{progress}% — {transferred}/{total} bytes</div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {active && <button onClick={() => cancelFileTransfer(transferId)}>Cancel</button>}
    </section>
  );
}
