export function collectTelemetry() {
  return { cpu: 0, memory: 0, disk: 0, network: 0, uptime: (typeof process !== 'undefined' ? process.uptime() : 0), platform: (typeof process !== 'undefined' ? process.platform : 'browser'), processes: [] };
}
export function sanitizeTelemetry(t) { const { token, password, secret, env, ...rest } = t || {}; return rest; }
EOF