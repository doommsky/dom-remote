export function collectTelemetry() {
  return { cpu: 0, memory: 0, disk: 0, network: 0, uptime: process.uptime(), platform: process.platform, processes: [] };
}
export function sanitizeTelemetry(t) { const { token, password, ...rest } = t || {}; return rest; }
EOF