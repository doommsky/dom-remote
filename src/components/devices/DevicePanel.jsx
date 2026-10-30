import React from 'react';

const DESIGN_SYSTEM = {
  background: '#080D19',
  surface: '#0C1322',
  raised: '#151B2D',
  control: '#1A2135',
  border: '#293650',
  primaryPurple: '#A855F7',
  brightViolet: '#C084FC',
  lavender: '#B99AFF',
  blue: '#3B82F6',
  onlineGreen: '#39F59B',
  amber: '#F59E0B',
  errorRed: '#FF334D',
  text: '#F4F5FF',
  textSecondary: '#C0C9DB',
  mutedGrey: '#8E9AB2',
  fontFamily: "'Inter', 'system-ui', sans-serif",
  fontSize: '14px',
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
  borderRadius: '16px',
  borderWidth: '1px',
  borderColor: '#293650',
  shadow: '0 10px 26px rgba(0, 0, 0, 0.24)',
  spacingSmall: '4px',
  spacingMedium: '8px',
  spacingLarge: '16px',
  spacingXLarge: '24px',
};

const StatusIndicator = ({ online, connecting }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{
      color: connecting ? DESIGN_SYSTEM.primaryPurple : (online ? DESIGN_SYSTEM.onlineGreen : DESIGN_SYSTEM.mutedGrey),
      width: 20,
      height: 20,
      animation: connecting ? 'pulse 1s infinite' : 'none',
    }}
  >
    <style jsx>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2c-3.309 0-6 2.691-6 6s2.691 6 6 6s6-2.691 6-6s-2.691-6-6-6zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
  </svg>
);

const Card = ({ children, style = {}, className }) => (
  <div style={{
    backgroundColor: DESIGN_SYSTEM.surface,
    borderRadius: DESIGN_SYSTEM.borderRadius,
    border: `1px solid rgba(128, 128, 128, 0.2)`,
    padding: DESIGN_SYSTEM.spacingLarge,
    ...style,
  }} className={className}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', disabled, loading, style = {}, ...props }) => {
  const baseStyle = {
    fontFamily: DESIGN_SYSTEM.fontFamily,
    fontSize: '13px',
    fontWeight: DESIGN_SYSTEM.fontWeightMedium,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    padding: DESIGN_SYSTEM.spacingSmall,
    borderRadius: '6px',
    border: 'none',
    transition: 'background-color 150ms ease',
    opacity: disabled || loading ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    ...style,
  };

  const variants = {
    primary: { backgroundColor: DESIGN_SYSTEM.primaryPurple, color: '#FFFFFF' },
    secondary: { background: 'none', color: DESIGN_SYSTEM.onlineGreen, border: 'none' },
    danger: { background: 'none', color: DESIGN_SYSTEM.errorRed, border: `1px solid ${DESIGN_SYSTEM.errorRed}` },
    ghost: { background: 'none', color: DESIGN_SYSTEM.mutedGrey, border: '1px solid rgba(128, 128, 128, 0.3)' },
    success: { backgroundColor: DESIGN_SYSTEM.onlineGreen, color: '#0B0D18' },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...baseStyle, ...variants[variant] }}
      {...props}
    >
      {loading && <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
      {children}
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
};

const DeviceCard = ({ device, isCurrent, onConnect, onSettings, onRevoke, connecting }) => (
  <Card style={{ marginBottom: DESIGN_SYSTEM.spacingMedium, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: DESIGN_SYSTEM.spacingMedium }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN_SYSTEM.spacingMedium, flex: 1 }}>
      <StatusIndicator online={device.last_seen && Date.now() - device.last_seen < 60000} connecting={connecting} />
      <div>
        <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.onlineGreen }}>
          {device.name} {isCurrent && <span style={{ fontSize: '10px', color: DESIGN_SYSTEM.primaryPurple, marginLeft: '6px' }}>(this device)</span>}
        </div>
        <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '11px', color: DESIGN_SYSTEM.mutedGrey }}>
          {device.type} · {device.platform} · {device.remote_access_enabled ? 'Remote access ON' : 'Remote access OFF'}
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', gap: DESIGN_SYSTEM.spacingSmall }}>
      {device.remote_access_enabled && !isCurrent && (
        <Button variant="primary" onClick={() => onConnect(device.id)} disabled={connecting} size="sm">
          Connect
        </Button>
      )}
      <Button variant="ghost" onClick={() => onSettings(device)} size="sm">Settings</Button>
      {!isCurrent && (
        <Button variant="danger" onClick={() => onRevoke(device.id)} size="sm">Revoke</Button>
      )}
    </div>
  </Card>
);

export default function DevicePanel({ devices = [], currentDeviceId, onConnect, onSettings, onRevoke, connectingDevice }) {
  const onlineDevices = devices.filter(d => d.last_seen && Date.now() - d.last_seen < 60000);
  const offlineDevices = devices.filter(d => !d.last_seen || Date.now() - d.last_seen >= 60000);

  return (
    <section>
      <Card style={{ marginBottom: DESIGN_SYSTEM.spacingLarge }}>
        <h3 style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.primaryPurple, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: DESIGN_SYSTEM.primaryPurple }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c-3.87 0-7 3.13-7 7v5h10v-5c0-3.87-3.13-7-7-7zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>
          Online Devices ({onlineDevices.length})
        </h3>
        {onlineDevices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: DESIGN_SYSTEM.spacingXLarge, color: DESIGN_SYSTEM.mutedGrey }}>
            <p>No devices online</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Enable remote access on your devices to see them here</p>
          </div>
        ) : (
          onlineDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              isCurrent={device.id === currentDeviceId}
              onConnect={onConnect}
              onSettings={onSettings}
              onRevoke={onRevoke}
              connecting={connectingDevice === device.id}
            />
          ))
        )}
      </Card>

      {offlineDevices.length > 0 && (
        <Card>
          <h3 style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightMedium, color: DESIGN_SYSTEM.primaryPurple, margin: '0 0 16px 0' }}>
            Offline Devices ({offlineDevices.length})
          </h3>
          {offlineDevices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              isCurrent={device.id === currentDeviceId}
              onConnect={onConnect}
              onSettings={onSettings}
              onRevoke={onRevoke}
              connecting={false}
            />
          ))}
        </Card>
      )}
    </section>
  );
}