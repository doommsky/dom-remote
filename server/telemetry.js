export function sanitize(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const { token, password, secret, env, ...rest } = payload;
  return rest;
}
export function validTelemetry(t) {
  return t && typeof t === 'object' && !Array.isArray(t) && Object.keys(t).length <= 20;
}
EOF