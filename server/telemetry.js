const telemetryBuckets = new Map();
export function sanitizeTelemetry(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const { token, password, secret, env, privateKey, ...rest } = payload;
  return rest;
}
export function validTelemetry(t) {
  return t && typeof t === 'object' && !Array.isArray(t) && Object.keys(t).length <= 20;
}
export function authorizeTelemetry(session, requesterId, targetId) {
  if (!session || session.status !== 'active') return false;
  return (session.host_device_id === requesterId && session.client_device_id === targetId) ||
         (session.client_device_id === requesterId && session.host_device_id === targetId);
}
export function throttleTelemetry(key, windowMs = 1000) {
  const now = Date.now();
  const last = telemetryBuckets.get(key) || 0;
  if (now - last < windowMs) return false;
  telemetryBuckets.set(key, now);
  return true;
}
export function handleTelemetryUpdate(session, payload) {
  if (!authorizeTelemetry(session, payload.sender, payload.target)) return null;
  if (!validTelemetry(payload.data)) return null;
  if (!throttleTelemetry(session.id)) return null;
  return sanitizeTelemetry(payload.data);
}
