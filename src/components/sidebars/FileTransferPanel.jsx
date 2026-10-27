import React from 'react';
export default function FileTransferPanel({ transfers = [] }) {
  return <section><h3>File Transfer</h3><ul>{transfers.map((t,i)=><li key={i}>{t.filename} {t.progress||0}%</li>)}</ul></section>;
}
EOF