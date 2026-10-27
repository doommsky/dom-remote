import React from 'react';
export default function RemoteViewPanel({ connected }) {
  return <section><h3>Remote View</h3><div>{connected ? 'Connected' : 'Disconnected'}</div></section>;
}
EOF