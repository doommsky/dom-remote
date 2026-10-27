export function collectTelemetry() {
  return {
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    disk: Math.random() * 100,
    network: Math.random() * 100,
    uptime: (typeof process !== 'undefined' ? process.uptime() : 0),
    platform: (typeof process !== 'undefined' ? process.platform : 'browser'),
    processes: []
  };
}
export function sanitizeTelemetry(t) { const { token, password, secret, env, privateKey, ...rest } = t || {}; return rest; }
EOF