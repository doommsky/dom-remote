import React from 'react';
import { DESIGN_SYSTEM, Card, Button, Header, SessionCard } from '../shared/ui';

export default function RemoteViewPanel({ error, onClearError, incomingSession, onAcceptSession, onRejectSession, onAddDevice }) {
  return (
    <div style={{ maxWidth: '600px', padding: DESIGN_SYSTEM.spacingXLarge, margin: '0 auto' }}>
      <Header 
        title="DOM Remote" 
        subtitle="Your devices" 
        actions={<Button variant="ghost" onClick={onAddDevice} size="sm">+ Add Device</Button>}
      />

      {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '4px', padding: DESIGN_SYSTEM.spacingMedium, marginBottom: DESIGN_SYSTEM.spacingMedium, color: DESIGN_SYSTEM.errorRed, fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{error}</span><Button variant="secondary" onClick={onClearError} size="sm">Dismiss</Button></div>}

      {incomingSession && <SessionCard session={incomingSession} onAccept={onAcceptSession} onReject={onRejectSession} />}
    </div>
  );
}