import React from 'react';
export default function AppShell({ left, center, right }) {
  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 12, padding: 12, minHeight: '100vh' }}>
      <aside className="col-left">{left}</aside>
      <main className="col-center">{center}</main>
      <aside className="col-right">{right}</aside>
      <style>{`@media (max-width: 900px){ .app-shell{ grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}
EOF