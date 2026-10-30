import React from 'react';

export const DESIGN_SYSTEM = {
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

export const StatusIndicator = ({ online, connecting }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-label={connecting ? 'connecting' : (online ? 'online' : 'offline')}
    role="img"
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

export const Card = ({ children, style = {}, className }) => (
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

export const Button = ({ children, onClick, variant = 'primary', disabled, loading, style = {}, ...props }) => {
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

export const Header = ({ title, subtitle, actions }) => (
  <header style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: DESIGN_SYSTEM.spacingXLarge 
  }}>
    <div>
      <h1 style={{
        fontFamily: DESIGN_SYSTEM.fontFamily,
        fontSize: '20px',
        fontWeight: DESIGN_SYSTEM.fontWeightBold,
        margin: 0,
        color: DESIGN_SYSTEM.onlineGreen,
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontFamily: DESIGN_SYSTEM.fontFamily,
          fontSize: '12px',
          color: DESIGN_SYSTEM.mutedGrey,
          margin: '4px 0 0 0',
        }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div style={{ display: 'flex', gap: DESIGN_SYSTEM.spacingSmall }}>{actions}</div>}
  </header>
);

export const DeviceCard = ({ device, isCurrent, onConnect, onSettings, onRevoke, connecting }) => (
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

export const SessionCard = ({ session, onAccept, onReject, onEnd }) => (
  <Card style={{ borderColor: DESIGN_SYSTEM.primaryPurple, animation: 'slideIn 0.3s ease' }}>
    <style jsx>{`
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '14px', fontWeight: DESIGN_SYSTEM.fontWeightBold, color: DESIGN_SYSTEM.onlineGreen }}>
          Incoming Connection
        </div>
        <div style={{ fontFamily: DESIGN_SYSTEM.fontFamily, fontSize: '12px', color: DESIGN_SYSTEM.mutedGrey }}>
          {session.clientName} wants to connect
        </div>
      </div>
      <div style={{ display: 'flex', gap: DESIGN_SYSTEM.spacingSmall }}>
        <Button variant="success" onClick={() => onAccept(session.sessionId)}>Accept</Button>
        <Button variant="danger" onClick={() => onReject(session.sessionId)}>Reject</Button>
      </div>
    </div>
  </Card>
);