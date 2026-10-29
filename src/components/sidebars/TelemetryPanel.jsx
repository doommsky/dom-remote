import React from 'react';
export default function TelemetryPanel({ metrics }) {
  return (
    <section>
      <h3>Telemetry (simulated)</h3>
      <div>CPU: {metrics?.cpu}</div>
      <div>Memory: {metrics?.memory}</div>
      <div>Disk: {metrics?.disk}</div>
      <div>Network: {metrics?.network}</div>
      <div>Uptime: {metrics?.uptime}</div>
      <div>Platform: {metrics?.platform}</div>
    </section>
  );
}
