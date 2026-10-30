import React, { useState, useEffect } from 'react';
import { onTransferProgress, onTransferComplete, onTransferError, onTransferCancelled, cancelFileTransfer } from '../../lib/fileTransfer.js';

export default function FileTransferPanel({ transferId, filename, size, progress: progressProp, status: statusProp, error: errorProp }) {
  const [status, setStatus] = useState(statusProp || 'requested');
  const [progress, setProgress] = useState(progressProp || 0);
  const [transferred, setTransferred] = useState(0);
  const [total, setTotal] = useState(size || 0);
  const [error, setError] = useState(errorProp || '');

  useEffect(() => {
    onTransferProgress((m) => { setStatus('active'); setProgress(m.percent || 0); setTransferred(m.transferredBytes || 0); setTotal(m.totalBytes || size || 0); });
    onTransferComplete(() => { setStatus('completed'); setProgress(100); });
    onTransferError((m) => { setStatus('failed'); setError(m.error || 'Transfer failed'); });
    onTransferCancelled(() => { setStatus('cancelled'); });
  }, [size]);

  useEffect(() => {
    if (statusProp) setStatus(statusProp);
  }, [statusProp]);

  useEffect(() => {
    if (progressProp !== undefined) setProgress(progressProp);
  }, [progressProp]);

  useEffect(() => {
    if (errorProp !== undefined) setError(errorProp || '');
  }, [errorProp]);

  const active = status === 'active' || status === 'awaiting_consent' || status === 'requested';
  return (
    <section>
      <h3>File Transfer</h3>
      <div>File: {filename} ({size} bytes)</div>
      <div>Status: {status}</div>
      {status === 'completed' && <div>Transfer complete</div>}
      {status === 'failed' && error && <div style={{ color: 'red' }}>{error}</div>}
      {status === 'cancelled' && <div>Transfer cancelled</div>}
      <progress value={progress} max={100} />
      <div>{progress}% — {transferred}/{total} bytes</div>
      {error && status !== 'failed' && <div style={{ color: 'red' }}>{error}</div>}
      {active && <button onClick={() => cancelFileTransfer(transferId)}>Cancel</button>}
    </section>
  );
}