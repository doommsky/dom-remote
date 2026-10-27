import React, { useState } from 'react';
export default function FileTransferPanel() {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [bytes, setBytes] = useState(0);
  return (
    <section>
      <h3>File Transfer</h3>
      <div>Status: {status}</div>
      <div>Progress: {progress}% ({bytes} bytes)</div>
      <progress value={progress} max={100} />
      <button onClick={() => setStatus('cancelled')}>Cancel</button>
    </section>
  );
}
EOF