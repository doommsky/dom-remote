import React from 'react';

export default function TelemetryPanel({ metrics, loading, error, connected }) {
  if (loading) {
    return <section><h3>Telemetry</h3><div>Loading telemetry…</div></section>;
  }
  if (error) {
    return <section><h3>Telemetry</h3><div>{error}</div></section>;
  }
  if (!metrics) {
    return <section><h3>Telemetry</h3><div>No telemetry available</div></section>;
  }
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