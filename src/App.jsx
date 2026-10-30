import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signaling, webrtc, api, generateDeviceId, getDeviceInfo } from './lib/webrtc';
import AppShell from './components/layout/AppShell';
import DevicePanel from './components/devices/DevicePanel';
import RemoteViewPanel from './components/remote/RemoteViewPanel';
import TelemetryPanel from './components/sidebars/TelemetryPanel';
import { DESIGN_SYSTEM, Card, Button, StatusIndicator, Header, DeviceCard, SessionCard } from './components/shared/ui';











const Input = ({ value, onChange, placeholder, type = 'text', style = {}, ...props }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    type={type}
    style={{
      fontFamily: DESIGN_SYSTEM.fontFamily,
      fontSize: '13px',
      backgroundColor: DESIGN_SYSTEM.background,
      border: `1px solid rgba(128, 128, 128, 0.3)`,
      borderRadius: '6px',
      padding: '10px 12px',
      color: DESIGN_SYSTEM.onlineGreen,
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
      ...style,
    }}
    {...props}
  />
);

const Toggle = ({ label, checked, onChange, description }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: DESIGN_SYSTEM.spacingMedium, cursor: 'pointer' }}>
    <div style={{ position: 'relative', width: 44, height: 26 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
      />
      <span style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: checked ? DESIGN_SYSTEM.primaryPurple : 'rgba(128, 128, 128, 0.3)',
        borderRadius: 13,
        transition: 'background-color 150ms ease',
      }}>
        <span style={{
          position: 'absolute',
          top: 2,
          left: checked ? 24 : 2,
          width: 20, height: 20,
          backgroundColor: 'white',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left 150ms ease',
        }} />
      </span>
    </div>
    <div>
      <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '13px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.onlineGreen }}>
        {label}
      </div>
      {description && (
        <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '11px', color: DESIGN_SYSTEM.mutedGrey }}>
          {description}
        </div>
      )}
    </div>
  </label>
);





function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await api.login(email, password);
      } else {
        result = await api.register(email, password);
      }
      if (result.error) throw new Error(result.error);
      onAuth(result.token, result.userId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ backgroundColor: DESIGN_SYSTEM.background, color: DESIGN_SYSTEM.onlineGreen, minHeight: '100vh', fontFamily: DESIGN_SYSTEM.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: DESIGN_SYSTEM.spacingXLarge }}>
      <Card style={{ maxWidth: '400px', width: '100%' }}>
        <Header title="DOM Remote" subtitle={mode === 'login' ? 'Sign in to your account' : 'Create your account'} />
        
        {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '4px', padding: DESIGN_SYSTEM.spacingMedium, marginBottom: DESIGN_SYSTEM.spacingMedium, color: DESIGN_SYSTEM.errorRed, fontSize: '12px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: DESIGN_SYSTEM.spacingMedium }}>
            <label style={{ display: 'block', fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey, marginBottom: '6px' }}>Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" required autoComplete="email" />
          </div>
          <div style={{ marginBottom: DESIGN_SYSTEM.spacingLarge }}>
            <label style={{ display: 'block', fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey, marginBottom: '6px' }}>Password</label>
            <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
          <Button type="submit" variant="primary" style={{ width: '100%', padding: DESIGN_SYSTEM.spacingMedium }} loading={loading}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p style={{ marginTop: DESIGN_SYSTEM.spacingLarge, textAlign: 'center', fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', color: DESIGN_SYSTEM.primaryPurple, cursor: 'pointer', fontWeight: DESIGN_SYSTEM.fontWeightMedium }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </Card>
    </main>
  );
}

function HomeScreen({ userId, token, devices, currentDeviceId, onConnect, onSettings, onRevoke, onAddDevice, connectingDevice, incomingSession, onAcceptSession, onRejectSession, error, onClearError, telemetryMetrics, telemetryLoading, telemetryError, telemetryConnected }) {
  const onlineDevices = devices.filter(d => d.last_seen && Date.now() - d.last_seen < 60000);
  const offlineDevices = devices.filter(d => !d.last_seen || Date.now() - d.last_seen >= 60000);

  return (
    <AppShell
      left={
        <DevicePanel
          devices={devices}
          currentDeviceId={currentDeviceId}
          onConnect={onConnect}
          onSettings={onSettings}
          onRevoke={onRevoke}
          connectingDevice={connectingDevice}
        />
      }
      center={
        <RemoteViewPanel
          error={error}
          onClearError={onClearError}
          incomingSession={incomingSession}
          onAcceptSession={onAcceptSession}
          onRejectSession={onRejectSession}
          onAddDevice={onAddDevice}
        />
      }
      right={
        <TelemetryPanel
          metrics={telemetryMetrics}
          loading={telemetryLoading}
          error={telemetryError}
          connected={telemetryConnected}
        />
      }
    />
  );
}

function RemoteScreen({ connection, remoteStream, localStream, connectionState, onDisconnect, onToggleFullscreen, isFullscreen }) {
  const videoRef = useRef(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
    }
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.srcObject) {
        // Could add stats monitoring here
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [remoteStream]);

  return (
    <main style={{ backgroundColor: DESIGN_SYSTEM.background, color: DESIGN_SYSTEM.onlineGreen, minHeight: '100vh', fontFamily: DESIGN_SYSTEM.fontFamily, overflow: isFullscreen ? 'hidden' : 'auto' }}>
      {!isFullscreen && (
        <div style={{ maxWidth: '1000px', padding: DESIGN_SYSTEM.spacingXLarge, margin: '0 auto' }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN_SYSTEM.spacingLarge }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_SYSTEM.spacingMedium }}>
              <StatusIndicator online={connectionState === 'connected'} />
              <span style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '18px', fontWeight: DESIGN_SYSTEM.fontWeightBold, color: DESIGN_SYSTEM.onlineGreen }}>
                Remote Desktop
              </span>
              <span style={{ backgroundColor: 'rgba(74, 222, 128, 0.2)', border: '1px solid #4ADE80', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: '#4ADE80' }}>
                {connectionState?.toUpperCase() || 'CONNECTING'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: DESIGN_SYSTEM.spacingMedium, alignItems: 'center' }}>
              <span style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey }}>
                {stats.bitrate ? `${Math.round(stats.bitrate / 1000)} kbps` : ''}
              </span>
              <Button variant="secondary" onClick={onToggleFullscreen} size="sm">
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
              <Button variant="danger" onClick={onDisconnect} size="sm">Disconnect</Button>
            </div>
          </header>
        </div>
      )}

      <div style={{ 
        width: '100%', 
        height: isFullscreen ? '100vh' : '600px', 
        backgroundColor: '#000',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
          }}
        />
        {!remoteStream && (
          <div style={{ textAlign: 'center', color: DESIGN_SYSTEM.mutedGrey, pointerEvents: 'none' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>Waiting for stream...</p>
            <p style={{ fontSize: '12px' }}>{connectionState === 'connecting' ? 'Establishing connection...' : 'Host is preparing stream'}</p>
          </div>
        )}
        {connectionState === 'failed' && (
          <div style={{ position: 'absolute', textAlign: 'center', color: DESIGN_SYSTEM.errorRed, padding: DESIGN_SYSTEM.spacingLarge }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>Connection Failed</p>
            <p style={{ fontSize: '12px' }}>Unable to establish WebRTC connection</p>
            <Button variant="primary" onClick={onDisconnect} style={{ marginTop: DESIGN_SYSTEM.spacingMedium }}>Return to Devices</Button>
          </div>
        )}
      </div>

      {isFullscreen && (
        <div style={{ position: 'fixed', top: DESIGN_SYSTEM.spacingMedium, right: DESIGN_SYSTEM.spacingMedium, zIndex: 1000, display: 'flex', gap: DESIGN_SYSTEM.spacingSmall }}>
          <Button variant="ghost" onClick={onToggleFullscreen} size="sm">Exit Fullscreen</Button>
          <Button variant="danger" onClick={onDisconnect} size="sm">Disconnect</Button>
        </div>
      )}
    </main>
  );
}

function DeviceSettingsScreen({ device, onSave, onBack, onTestConnection }) {
  const [name, setName] = useState(device?.name || '');
  const [remoteAccess, setRemoteAccess] = useState(device?.remote_access_enabled || false);
  const [unattendedAccess, setUnattendedAccess] = useState(device?.unattended_access || false);
  const [visible, setVisible] = useState(device?.visible !== false);
  const [permissions, setPermissions] = useState(device?.permissions || { screen: true, input: true, file: false });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(device.id, { name, remote_access_enabled: remoteAccess, unattended_access: unattendedAccess, visible, permissions });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ backgroundColor: DESIGN_SYSTEM.background, color: DESIGN_SYSTEM.onlineGreen, minHeight: '100vh', fontFamily: DESIGN_SYSTEM.fontFamily }}>
      <div style={{ maxWidth: '500px', padding: DESIGN_SYSTEM.spacingXLarge, margin: '0 auto' }}>
        <Header title="Device Settings" subtitle={device?.name} actions={<Button variant="ghost" onClick={onBack} size="sm">Back</Button>} />

        <Card style={{ marginBottom: DESIGN_SYSTEM.spacingLarge }}>
          <h3 style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.primaryPurple, margin: '0 0 16px 0' }}>General</h3>
          <div style={{ marginBottom: DESIGN_SYSTEM.spacingMedium }}>
            <label style={{ display: 'block', fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey, marginBottom: '6px' }}>Device Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Laptop" />
          </div>
          <Toggle label="Visible to other devices" checked={visible} onChange={setVisible} description="Allow this device to appear in your device list" />
        </Card>

        <Card style={{ marginBottom: DESIGN_SYSTEM.spacingLarge }}>
          <h3 style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.primaryPurple, margin: '0 0 16px 0' }}>Remote Access</h3>
          <Toggle label="Enable remote access" checked={remoteAccess} onChange={setRemoteAccess} description="Allow other authorized devices to connect to this device" />
          <Toggle label="Unattended access" checked={unattendedAccess} onChange={setUnattendedAccess} description="Allow connections without accepting each session (requires remote access enabled)" disabled={!remoteAccess} />
        </Card>

        <Card style={{ marginBottom: DESIGN_SYSTEM.spacingLarge }}>
          <h3 style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.primaryPurple, margin: '0 0 16px 0' }}>Permissions</h3>
          <Toggle label="Screen viewing" checked={permissions.screen} onChange={e => setPermissions({...permissions, screen: e.target.checked})} description="Allow remote device to view screen" />
          <Toggle label="Input control" checked={permissions.input} onChange={e => setPermissions({...permissions, input: e.target.checked})} description="Allow remote device to control mouse/keyboard" disabled={!permissions.screen} />
          <Toggle label="File transfer" checked={permissions.file} onChange={e => setPermissions({...permissions, file: e.target.checked})} description="Allow file transfer between devices" />
        </Card>

        <Card style={{ marginBottom: DESIGN_SYSTEM.spacingLarge }}>
          <h3 style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.primaryPurple, margin: '0 0 16px 0' }}>Connection Test</h3>
          <Button variant="secondary" onClick={onTestConnection} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>
        </Card>

        <div style={{ display: 'flex', gap: DESIGN_SYSTEM.spacingMedium }}>
          <Button variant="primary" onClick={handleSave} loading={loading} style={{ flex: 1 }}>Save Changes</Button>
          <Button variant="ghost" onClick={onBack} style={{ flex: 1 }}>Cancel</Button>
        </div>
      </div>
    </main>
  );
}

function AddDeviceScreen({ token, userId, onBack, onSuccess }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();
      deviceInfo.name = name || deviceInfo.name;
      const result = await api.registerDevice(token, deviceInfo);
      if (result.error) throw new Error(result.error);
      onSuccess(result.device);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ backgroundColor: DESIGN_SYSTEM.background, color: DESIGN_SYSTEM.onlineGreen, minHeight: '100vh', fontFamily: DESIGN_SYSTEM.fontFamily }}>
      <div style={{ maxWidth: '500px', padding: DESIGN_SYSTEM.spacingXLarge, margin: '0 auto' }}>
        <Header title="Add Device" subtitle="Register this device to your account" actions={<Button variant="ghost" onClick={onBack} size="sm">Cancel</Button>} />

        {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '4px', padding: DESIGN_SYSTEM.spacingMedium, marginBottom: DESIGN_SYSTEM.spacingMedium, color: DESIGN_SYSTEM.errorRed, fontSize: '12px' }}>{error}</div>}

        <Card>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: DESIGN_SYSTEM.spacingLarge }}>
              <label style={{ display: 'block', fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey, marginBottom: '6px' }}>Device Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Laptop" autoFocus />
            </div>
            <div style={{ fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey, marginBottom: DESIGN_SYSTEM.spacingLarge }}>
              <p>Platform: {navigator.platform}</p>
              <p>Type: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
            </div>
            <Button type="submit" variant="primary" style={{ width: '100%', padding: DESIGN_SYSTEM.spacingMedium }} loading={loading}>
              Register Device
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

function HistoryScreen({ history, onBack }) {
  return (
    <main style={{ backgroundColor: DESIGN_SYSTEM.background, color: DESIGN_SYSTEM.onlineGreen, minHeight: '100vh', fontFamily: DESIGN_SYSTEM.fontFamily }}>
      <div style={{ maxWidth: '600px', padding: DESIGN_SYSTEM.spacingXLarge, margin: '0 auto' }}>
        <Header title="Connection History" subtitle="Recent sessions" actions={<Button variant="ghost" onClick={onBack} size="sm">Back</Button>} />

        {history.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: DESIGN_SYSTEM.spacingXLarge, color: DESIGN_SYSTEM.mutedGrey }}>
              <p>No connection history yet</p>
            </div>
          </Card>
        ) : (
          <Card>
            {history.map((session, i) => (
              <div key={session.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: DESIGN_SYSTEM.spacingMedium, borderBottom: i < history.length - 1 ? '1px solid rgba(128, 128, 128, 0.1)' : 'none' }}>
                <div>
                  <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '13px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.onlineGreen }}>
                    {session.host_name} → {session.client_name}
                  </div>
                  <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '11px', color: DESIGN_SYSTEM.mutedGrey }}>
                    {new Date(session.connected_at).toLocaleString()} · {session.duration ? `${Math.round(session.duration / 1000 / 60)} min` : 'Active'}
                  </div>
                </div>
                <StatusIndicator online={!session.disconnected_at} />
              </div>
            ))}
          </Card>
        )}
      </div>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState('auth');
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [connection, setConnection] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [incomingSession, setIncomingSession] = useState(null);
  const [connectingDevice, setConnectingDevice] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [telemetryMetrics, setTelemetryMetrics] = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState(null);
  const [telemetryConnected, setTelemetryConnected] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    const savedToken = localStorage.getItem('dom-os-token');
    const savedUserId = localStorage.getItem('dom-os-user-id');
    const savedDeviceId = localStorage.getItem('dom-os-device-id');
    if (savedToken && savedUserId) {
      setToken(savedToken);
      setUserId(savedUserId);
      setCurrentDeviceId(savedDeviceId);
      setScreen('home');
    }
  }, []);

  useEffect(() => {
    if (!token || !currentDeviceId) return;

    signaling.setAuth(token, currentDeviceId, userId);
    signaling.connect().catch(err => setError('Failed to connect to signaling server: ' + err.message));

    const unsubDevices = signaling.on('devices', (devices) => setDevices(devices));
    const unsubDeviceChange = signaling.on('device_change', (msg) => {
      setDevices(prev => {
        const idx = prev.findIndex(d => d.id === msg.deviceId);
        if (idx >= 0) {
          const updated = [...prev];
          if (msg.type === 'device_offline') {
            updated.splice(idx, 1);
          } else {
            updated[idx] = { ...updated[idx], ...msg };
          }
          return updated;
        }
        return prev;
      });
    });
    const unsubIncoming = signaling.on('incoming_session', (session) => {
      const me = devices.find(d => d.id === currentDeviceId);
      if (me?.unattended_access) {
        handleAcceptSession(session.sessionId);
      } else {
        setIncomingSession(session);
      }
    });
    const unsubAccepted = signaling.on('session_accepted', ({ sessionId, hostDeviceId }) => {
      setConnection({ sessionId, hostDeviceId, startedAt: new Date() });
      setScreen('remote');
      setIncomingSession(null);
      webrtc.initialize(false);
    });
    const unsubEnded = signaling.on('session_ended', ({ sessionId }) => {
      if (connection?.sessionId === sessionId) {
        handleDisconnect();
      }
    });
    const unsubError = signaling.on('session_error', ({ error }) => setError(error));
    const unsubHistory = signaling.on('history', (h) => setHistory(h));
    const unsubRevoked = signaling.on('revoked', () => {
      localStorage.clear();
      window.location.reload();
    });
    const unsubTelemetry = signaling.on('telemetry', (msg) => {
      setTelemetryMetrics(msg?.metrics ?? msg ?? null);
      setTelemetryLoading(false);
      setTelemetryError(null);
      setTelemetryConnected(true);
    });

    webrtc.on('remote_stream', ({ deviceId, stream }) => {
      setRemoteStream(stream);
      setConnectionState('connected');
    });
    webrtc.on('connection_state', ({ state }) => setConnectionState(state));
    webrtc.on('session_started', () => setConnectionState('connected'));
    webrtc.on('session_ended', () => handleDisconnect());
    webrtc.on('session_error', ({ error }) => setError(error));

    signaling.getDevices();
    signaling.getHistory();

    return () => {
      unsubDevices();
      unsubDeviceChange();
      unsubIncoming();
      unsubAccepted();
      unsubEnded();
      unsubError();
      unsubHistory();
      unsubRevoked();
      unsubTelemetry();
      signaling.disconnect();
      webrtc.cleanupAll();
    };
  }, [token, currentDeviceId, userId, connection?.sessionId]);

  const handleAuth = (newToken, newUserId) => {
    setToken(newToken);
    setUserId(newUserId);
    localStorage.setItem('dom-os-token', newToken);
    localStorage.setItem('dom-os-user-id', newUserId);
    setScreen('home');
  };

  const handleAddDevice = async () => {
    setScreen('add-device');
  };

  const handleDeviceRegistered = (device) => {
    setCurrentDeviceId(device.id);
    localStorage.setItem('dom-os-device-id', device.id);
    setScreen('home');
  };

  const handleConnect = (deviceId) => {
    setConnectingDevice(deviceId);
    setConnectionState('connecting');
    webrtc.initialize(false);
    webrtc.startSession(deviceId);
  };

  const handleAcceptSession = async (sessionId) => {
    signaling.acceptSession(sessionId);
    setIncomingSession(null);
    try {
      await webrtc.initialize(true);
      const clientDeviceId = incomingSession?.clientDeviceId;
      await webrtc.startHostSession(clientDeviceId, sessionId);
    } catch (err) {
      setError('Screen capture failed: ' + err.message);
    }
  };

  const handleRejectSession = (sessionId) => {
    signaling.rejectSession(sessionId);
    setIncomingSession(null);
  };

  const handleDisconnect = () => {
    if (connection?.sessionId) {
      signaling.endSession(connection.sessionId);
    }
    webrtc.cleanupAll();
    setConnection(null);
    setRemoteStream(null);
    setLocalStream(null);
    setConnectionState('disconnected');
    setScreen('home');
  };

  const handleSettings = (device) => {
    setSelectedDevice(device);
    setScreen('device-settings');
  };

  const handleRevoke = (deviceId) => {
    if (confirm('Revoke this device? It will be removed from your account.')) {
      signaling.revokeDevice(deviceId);
    }
  };

  const handleSaveDevice = async (deviceId, updates) => {
    try {
      await api.updateDevice(token, deviceId, updates);
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, ...updates } : d));
      setSelectedDevice(null);
      setScreen('home');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTestConnection = async () => {
    // Could implement a connection test here
    alert('Connection test would ping the signaling server and check WebRTC connectivity');
  };

  const handleBack = () => {
    setSelectedDevice(null);
    setScreen('home');
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (screen === 'auth') {
    return <AuthScreen onAuth={handleAuth} />;
  }

  if (screen === 'add-device') {
    return <AddDeviceScreen token={token} userId={userId} onBack={handleBack} onSuccess={handleDeviceRegistered} />;
  }

  if (screen === 'device-settings') {
    return <DeviceSettingsScreen device={selectedDevice} onSave={handleSaveDevice} onBack={handleBack} onTestConnection={handleTestConnection} />;
  }

  if (screen === 'history') {
    return <HistoryScreen history={history} onBack={handleBack} />;
  }

  if (screen === 'remote') {
    return <RemoteScreen 
      connection={connection} 
      remoteStream={remoteStream} 
      localStream={localStream} 
      connectionState={connectionState}
      onDisconnect={handleDisconnect}
      onToggleFullscreen={handleToggleFullscreen}
      isFullscreen={isFullscreen}
    />;
  }

  return <HomeScreen
    userId={userId}
    token={token}
    devices={devices}
    currentDeviceId={currentDeviceId}
    onConnect={handleConnect}
    onSettings={handleSettings}
    onRevoke={handleRevoke}
    onAddDevice={handleAddDevice}
    connectingDevice={connectingDevice}
    incomingSession={incomingSession}
    onAcceptSession={handleAcceptSession}
    onRejectSession={handleRejectSession}
    error={error}
    onClearError={clearError}
    telemetryMetrics={telemetryMetrics}
    telemetryLoading={telemetryLoading}
    telemetryError={telemetryError}
    telemetryConnected={telemetryConnected}
  />;
}