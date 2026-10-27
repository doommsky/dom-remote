import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3001';

async function testWebSocket() {
  console.log('Testing WebSocket signaling...\n');

  // Get a fresh token + device via REST
  const email = `ws${Date.now()}@domos.local`;
  const reg = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'test123' })
  }).then(r => r.json());
  console.log('✅ REST register for WS test');

  const dev = await fetch(`${API_URL}/api/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.token}` },
    body: JSON.stringify({ name: 'WS Test Device', type: 'desktop', platform: 'Windows' })
  }).then(r => r.json());
  console.log('✅ REST device register:', dev.deviceId);

  // Connect WebSocket
  const ws = new WebSocket(WS_URL);
  const received = [];
  const waitFor = (type, timeoutMs = 5000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${type}"`)), timeoutMs);
    const check = (msg) => {
      if (msg.type === type) { clearTimeout(timer); resolve(msg); }
    };
    // check already-received messages first
    const existing = received.find(check);
    if (existing) return;
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      received.push(msg);
      check(msg);
    });
  });

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('✅ WebSocket connected');

  // Auth
  ws.send(JSON.stringify({ type: 'auth', token: reg.token, deviceId: dev.deviceId }));
  const authResult = await waitFor('auth_success');
  console.log('✅ WS auth_success:', authResult.deviceId);

  // Device list
  const list = await waitFor('device_list');
  console.log('✅ WS device_list:', list.devices.length, 'device(s)');

  // Ping/pong
  ws.send(JSON.stringify({ type: 'ping' }));
  await waitFor('pong');
  console.log('✅ WS ping/pong');

  // Update device over WS
  ws.send(JSON.stringify({ type: 'update_device', deviceId: dev.deviceId, remote_access_enabled: true }));
  await waitFor('device_updated');
  console.log('✅ WS update_device (remote access enabled)');

  ws.close();
  console.log('\n🎉 All WebSocket signaling tests passed!');
  process.exit(0);
}

testWebSocket().catch(err => {
  console.error('❌ WS test failed:', err.message);
  process.exit(1);
});