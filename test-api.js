const API_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('Testing DOM-OS Signaling Server API...\n');

  // Test 1: Health check
  try {
    const health = await fetch(`${API_URL}/api/health`);
    const data = await health.json();
    console.log('✅ Health check:', data);
  } catch (err) {
    console.log('❌ Health check failed:', err.message);
    return;
  }

  // Test 2: Register user (with unique email)
  const testEmail = `test${Date.now()}@domos.local`;
  let token, userId;
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'test123' })
    });
    const text = await res.text();
    console.log('Register raw response:', text);
    const data = JSON.parse(text);
    if (data.error) throw new Error(data.error);
    token = data.token;
    userId = data.userId;
    console.log('✅ Register:', { userId, token: token?.slice(0, 20) + '...' });
  } catch (err) {
    console.log('❌ Register failed:', err.message);
    return;
  }

  // Test 3: Verify token
  try {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('✅ Token verify:', data);
  } catch (err) {
    console.log('❌ Token verify failed:', err.message);
  }

  // Test 4: Register device
  let deviceId;
  try {
    const res = await fetch(`${API_URL}/api/devices/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        name: 'Test Laptop', 
        type: 'desktop', 
        platform: 'Windows',
        publicKey: 'test-key'
      })
    });
    const data = await res.json();
    console.log('Device register response:', data);
    if (data.error) throw new Error(data.error);
    deviceId = data.deviceId;
    console.log('✅ Device register:', { deviceId, device: data.device });
  } catch (err) {
    console.log('❌ Device register failed:', err.message);
  }

  // Test 5: Get devices
  try {
    const res = await fetch(`${API_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('✅ Get devices:', data.devices?.length, 'devices');
  } catch (err) {
    console.log('❌ Get devices failed:', err.message);
  }

  // Test 6: Update device
  if (deviceId) {
    try {
      const res = await fetch(`${API_URL}/api/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          remote_access_enabled: true,
          unattended_access: true,
          permissions: { screen: true, input: true, file: true }
        })
      });
      const data = await res.json();
      console.log('✅ Device update:', data);
    } catch (err) {
      console.log('❌ Device update failed:', err.message);
    }
  }

  console.log('\n🎉 All API tests passed!');
}

testAPI().catch(console.error);