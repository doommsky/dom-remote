import React from 'react';
import { DESIGN_SYSTEM, Card, Button, StatusIndicator, DeviceCard } from '../shared/ui';

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