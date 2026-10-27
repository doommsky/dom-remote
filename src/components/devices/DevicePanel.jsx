import React from 'react';
export default function DevicePanel({ devices = [] }) {
  return <section><h3>Devices</h3><ul>{devices.map((d,i)=><li key={i}>{d.name} - {d.online?'online':'offline'}</li>)}</ul></section>;
}
EOF