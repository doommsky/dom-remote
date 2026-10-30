const telemetryBuckets = new Map();
export function sanitizeTelemetry(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const { token, password, secret, env, privateKey, ...rest } = payload;
  return rest;
}
export function validTelemetry(t) {
  return t && typeof t === 'object' && !Array.isArray(t) && Object.keys(t).length <= 20;
}
export function authorizeTelemetry(session, requesterDeviceId, targetDeviceId) {
  if (!session || session.status !== 'active') return false;
  return (session.host_device_id === requesterDeviceId && session.client_device_id === targetDeviceId) ||
         (session.client_device_id === requesterDeviceId && session.host_device_id === targetDeviceId);
}
export function throttleTelemetry(sessionId, deviceId, now, windowMs = 1000) {
  const key = sessionId + ':' + deviceId;
  const last = telemetryBuckets.get(key) || 0;
  if (now - last < windowMs) return false;
  telemetryBuckets.set(key, now);
  return true;
}
export function handleTelemetryUpdate(session, payload) {
  if (!authorizeTelemetry(session, payload.sender, payload.target)) return null;
  if (!validTelemetry(payload.data)) return null;
  if (!throttleTelemetry(session.id, payload.sender, Date.now())) return null;
  return sanitizeTelemetry(payload.data);
}
