import React from 'react';
export default function TelemetryPanel({ metrics }) {
  return <section><h3>Telemetry</h3><pre>{JSON.stringify(metrics||{},null,2)}</pre></section>;
}
EOF