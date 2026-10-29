const ALLOWED = ['cpu', 'memory', 'disk', 'network', 'uptime', 'platform', 'processes'];

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

export function sanitizeTelemetry(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return {};
  const out = {};
  for (const key of ALLOWED) {
    if (Object.prototype.hasOwnProperty.call(t, key)) {
      const v = t[key];
      if (key === 'platform') {
        out[key] = typeof v === 'string' ? v.slice(0, 64) : '';
      } else if (key === 'processes') {
        out[key] = Array.isArray(v) ? v.slice(0, 50) : [];
      } else {
        out[key] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      }
    }
  }
  return out;
}
