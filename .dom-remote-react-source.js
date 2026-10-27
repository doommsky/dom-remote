// DOM Remote - Premium Dark Remote Access App
// Style A: Premium Dark - deep navy and near-black, electric purple accents

import React, { useState, useEffect, useRef, useCallback } from "react";

const DESIGN_SYSTEM = {
  // Core palette - Premium Dark
  background: "#0B0D18",
  surface: "#171B2A",
  primaryPurple: "#7C3AED",
  onlineGreen: "#4ADE80",
  mutedGrey: "#6B7280",
  errorRed: "#EF4444",

  // Typography
  fontFamily: "'Inter', 'system-ui', sans-serif",
  fontSize: "14px",
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,

  // Shape
  borderRadius: "8px",
  borderWidth: "1px",
  borderColor: "rgba(128, 128, 128, 0.3)",

  // Shadow
  shadow: "0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 2px 6px 0 rgba(0, 0, 0, 0.1)",

  // Spacing
  spacingSmall: "4px",
  spacingMedium: "8px",
  spacingLarge: "16px",
  spacingXLarge: "24px",
};

const MAX_REMOTE_ROWS = 12;
const MAX_REMOTE_COLUMNS = 8;

export default function App({ input, hostContext }) {
  const theme = useTheme(hostContext);
  const [screen, setScreen] = useState("home");
  const [laptop, setLaptop] = useState(null);
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState(null);
  const [showConnecting, setShowConnecting] = useState(false);
  const remoteRef = useRef(null);

  // Initialize from saved laptop or show welcome
  useEffect(() => {
    // Check for saved laptop connection
    const saved = localStorage.getItem("dom-remote-laptop");
    if (saved) {
      setLaptop(JSON.parse(saved));
    }
  }, []);

  // Connect to laptop
  const handleConnect = async () => {
    if (!laptop) {
      setError("No laptop selected. Please ensure the laptop agent is running.");
      return;
    }

    setShowConnecting(true);
    setError(null);

    try {
      // In a real implementation, this would call the remote session creation
      // For now, simulate connection flow
      const success = await simulateConnection(laptop);
      
      if (success) {
        setConnection({
          laptopId: laptop.id,
          startedAt: new Date(),
          status: "connected",
        });
        setScreen("remote");
        localStorage.setItem("dom-remote-laptop", JSON.stringify(laptop));
      } else {
        setError("Failed to connect to laptop. Is it online and the agent running?");
      }
    } catch (err) {
      setError("Connection error: " + (err.message || "Unknown error"));
    } finally {
      setShowConnecting(false);
    }
  };

  // Simulate connection - in real app this would use remote-session:create
  const simulateConnection = async (laptop) => {
    // Simulate network discovery and connection
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Check if laptop is online (mock)
    const isOnline = laptop?.online !== false;
    
    if (!isOnline) {
      return false;
    }
    
    // Mock successful connection
    return true;
  };

  // Disconnect
  const handleDisconnect = () => {
    setConnection(null);
    setScreen("home");
    localStorage.removeItem("dom-remote-laptop");
  };

  // Error handling
  const clearError = () => setError(null);

  if (screen === "home") {
    return renderHomeScreen(laptop, error, clearError, handleConnect, showConnecting);
  }

  if (screen === "remote") {
    return renderRemoteScreen(connection, handleDisconnect, error, clearError);
  }

  if (screen === "settings") {
    return renderSettingsScreen(handleDisconnect);
  }

  return null;
}

function renderHomeScreen(laptop, error, onClearError, onConnect, showConnecting) {
  const hasLaptop = laptop !== null;
  const laptopOnline = laptop?.online ?? true;
  const laptopName = laptop?.name ?? "My Laptop";
  const laptopStatus = laptopOnline ? "Online · Ready to connect" : "Offline";

  return (
    <main className="app" style={{
      ...theme,
      backgroundColor: DESIGN_SYSTEM.background,
      color: DESIGN_SYSTEM.onlineGreen,
    }}>
      <div className="container" style={{
        maxWidth: "420px",
        padding: DESIGN_SYSTEM.spacingXLarge,
      }}>
        <header style={{
          textAlign: "center",
          marginBottom: DESIGN_SYSTEM.spacingXLarge,
        }}>
          <h1 style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "20px",
            fontWeight: DESIGN_SYSTEM.fontWeightBold,
            margin: 0,
            color: DESIGN_SYSTEM.onlineGreen,
          }}>
            DOM Remote
          </h1>
          <p style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "12px",
            color: DESIGN_SYSTEM.mutedGrey,
            margin: "8px 0 0 0",
          }}>
            Personal remote access
          </p>
        </header>

        <div style={{
          backgroundColor: DESIGN_SYSTEM.surface,
          borderRadius: DESIGN_SYSTEM.borderRadius,
          border: `1px solid rgba(128, 128, 128, 0.2)`,
          padding: DESIGN_SYSTEM.spacingLarge,
          marginBottom: DESIGN_SYSTEM.spacingLarge,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{
                fontFamily: DESIGN_SYSTEM.fontFamily,
                fontSize: "14px",
                fontWeight: DESIGN_SYSTEM.fontWeightMedium,
                color: DESIGN_SYSTEM.onlineGreen,
                marginBottom: DESIGN_SYSTEM.spacingSmall,
              }}>
                {laptopName}
              </div>
              <div style={{
                fontFamily: DESIGN_SYSTEM.fontFamily,
                fontSize: "12px",
                color: DESIGN_SYSTEM.mutedGrey,
              }}>
                {laptopStatus}
              </div>
            </div>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{
                color: laptopOnline ? DESIGN_SYSTEM.onlineGreen : DESIGN_SYSTEM.mutedGrey,
                width: 20,
                height: 20,
              }}
            >
              <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2c-3.309 0-6 2.691-6 6s2.691 6 6 6s6-2.691 6-6s-2.691-6-6-6zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
          </div>

          {error && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid #EF4444",
              borderRadius: "4px",
              padding: DESIGN_SYSTEM.spacingMedium,
              marginTop: DESIGN_SYSTEM.spacingMedium,
              color: DESIGN_SYSTEM.errorRed,
              fontSize: "12px",
            }}>
              {error}
            </div>
          )}
        </div>

        {showConnecting && (
          <div style={{
            textAlign: "center",
            marginTop: DESIGN_SYSTEM.spacingLarge,
          }}>
            <div style={{
              width: 32,
              height: 32,
              border: "3px solid #7C3AED",
              borderRadius: "50%",
              margin: "0 auto 12px auto",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              color: DESIGN_SYSTEM.onlineGreen,
            }}>
              Connecting to {laptopName}...
            </p>
          </div>
        )}

        <button
          onClick={onConnect}
          style={{
            width: "100%",
            backgroundColor: DESIGN_SYSTEM.primaryPurple,
            border: "none",
            borderRadius: "6px",
            padding: DESIGN_SYSTEM.spacingMedium,
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "15px",
            fontWeight: DESIGN_SYSTEM.fontWeightMedium,
            color: "#FFFFFF",
            cursor: "pointer",
            marginTop: DESIGN_SYSTEM.spacingSmall,
            transition: "background-color 150ms ease",
          }}
          disabled={showConnecting}
          aria-disabled={showConnecting}
        >
          {showConnecting ? "Connecting..." : "Connect"}
        </button>

        <p style={{
          marginTop: DESIGN_SYSTEM.spacingLarge,
          fontFamily: DESIGN_SYSTEM.fontFamily,
          fontSize: "12px",
          color: DESIGN_SYSTEM.mutedGrey,
          textAlign: "center",
        }}>
          One-tap connect for trusted devices
        </p>
      </div>
    </main>
  );
}

function renderRemoteScreen(connection, onDisconnect, onError, onClearError) {
  return (
    <main className="app" style={{
      ...theme,
      backgroundColor: DESIGN_SYSTEM.background,
      color: DESIGN_SYSTEM.onlineGreen,
    }}>
      <div className="container" style={{
        maxWidth: "800px",
        padding: DESIGN_SYSTEM.spacingXLarge,
      }}>
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: DESIGN_SYSTEM.spacingLarge,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: DESIGN_SYSTEM.spacingMedium,
          }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ color: DESIGN_SYSTEM.onlineGreen, width: 24, height: 24 }}
            >
              <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2c-3.309 0-6 2.691-6 6s2.691 6 6 6s6-2.691 6-6s-2.691-6-6-6zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
            <span style={{
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "18px",
              fontWeight: DESIGN_SYSTEM.fontWeightBold,
              color: DESIGN_SYSTEM.onlineGreen,
            }}>
              Remote Desktop
            </span>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: DESIGN_SYSTEM.spacingMedium,
          }}>
            <span style={{
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              color: DESIGN_SYSTEM.mutedGrey,
            }}>
              {connection ? 
                `Connected since ${connection.startedAt ? 
                  new Date(connection.startedAt).toLocaleTimeString() : "unknown"}` 
                : "Disconnected"}
            </span>
            <button
              onClick={onDisconnect}
              style={{
                background: "none",
                border: "none",
                color: DESIGN_SYSTEM.errorRed,
                fontFamily: DESIGN_SYSTEM.fontFamily,
                fontSize: "13px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Disconnect
            </button>
          </div>
        </header>

        <div style={{
          backgroundColor: DESIGN_SYSTEM.surface,
          borderRadius: DESIGN_SYSTEM.borderRadius,
          overflow: "hidden",
          marginBottom: DESIGN_SYSTEM.spacingLarge,
          border: `1px solid rgba(128, 128, 128, 0.2)`,
        }}>
          {/* Remote desktop area - would show actual stream */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 400,
              backgroundColor: "#000",
              overflow: "hidden",
            }}
          >
            {/* Placeholder for remote desktop stream */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(135deg, #1a1f2f 0%, #0b0d18 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: DESIGN_SYSTEM.mutedGrey,
              fontSize: "14px",
            }}>
              <p>Windows Desktop Stream</p>
              <p style={{ margin: "8px 0 0 0" }}>• Mouse touch mode • Keyboard • Fullscreen</p>
            </div>
          </div>

          {/* Connection quality indicator */}
          <div style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: "rgba(74, 222, 128, 0.2)",
            border: "1px solid #4ADE80",
            borderRadius: "4px",
            padding: "2px 6px",
            fontSize: "10px",
            color: "#4ADE80",
          }}>
            ✓ {connection?.status || "Connecting"}
          </div>
        </div>

        {/* Controls bar */}
        <div style={{
          backgroundColor: DESIGN_SYSTEM.surface,
          borderRadius: DESIGN_SYSTEM.borderRadius,
          border: `1px solid rgba(128, 128, 128, 0.2)`,
          padding: DESIGN_SYSTEM.spacingMedium,
          display: "flex",
          gap: DESIGN_SYSTEM.spacingSmall,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <button
            style={{
              background: "none",
              border: "none",
              color: DESIGN_SYSTEM.onlineGreen,
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            }}
          >
            Mouse mode
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              color: DESIGN_SYSTEM.onlineGreen,
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            }}
          >
            Keyboard
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              color: DESIGN_SYSTEM.onlineGreen,
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            }}
          >
            Fullscreen
          </button>
          <button
            onClick={onDisconnect}
            style={{
              background: "none",
              border: "1px solid #EF4444",
              borderRadius: "6px",
              color: "#EF4444",
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            }}
          >
            Disconnect
          </button>
        </div>
      </div>
    </main>
  );
}

function renderSettingsScreen(onDisconnect) {
  return (
    <main className="app" style={{
      ...theme,
      backgroundColor: DESIGN_SYSTEM.background,
      color: DESIGN_SYSTEM.onlineGreen,
    }}>
      <div className="container" style={{
        maxWidth: "420px",
        padding: DESIGN_SYSTEM.spacingXLarge,
      }}>
        <h2 style={{
          fontFamily: DESIGN_SYSTEM.fontFamily,
          fontSize: "18px",
          fontWeight: DESIGN_SYSTEM.fontWeightBold,
          color: DESIGN_SYSTEM.onlineGreen,
          marginBottom: DESIGN_SYSTEM.spacingLarge,
        }}>
          Settings
        </h2>

        <section style={{
          backgroundColor: DESIGN_SYSTEM.surface,
          borderRadius: DESIGN_SYSTEM.borderRadius,
          border: `1px solid rgba(128, 128, 128, 0.2)`,
          padding: DESIGN_SYSTEM.spacingLarge,
          marginBottom: DESIGN_SYSTEM.spacingLarge,
        }}>
          <h3 style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "14px",
            fontWeight: DESIGN_SYSTEM.fontWeightMedium,
            color: DESIGN_SYSTEM.primaryPurple,
            margin: "0 0 16px 0",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: DESIGN_SYSTEM.primaryPurple }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c-3.87 0-7 3.13-7 7v5h10v-5c0-3.87-3.13-7-7-7zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
            Security
          </h3>

          <div style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "12px",
            color: DESIGN_SYSTEM.mutedGrey,
          }}>
            <p>Trusted devices: {localStorage.getItem("dom-remote-trusted") || "None saved"}</p>
            <p>Authentication: Encrypted session</p>
            <p>Connection: Secure relay when needed</p>
          </div>
        </section>

        <section style={{
          backgroundColor: DESIGN_SYSTEM.surface,
          borderRadius: DESIGN_SYSTEM.borderRadius,
          border: `1px solid rgba(128, 128, 128, 0.2)`,
          padding: DESIGN_SYSTEM.spacingLarge,
          marginBottom: DESIGN_SYSTEM.spacingLarge,
        }}>
          <h3 style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "14px",
            fontWeight: DESIGN_SYSTEM.fontWeightMedium,
            color: DESIGN_SYSTEM.primaryPurple,
            margin: "0 0 16px 0",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: DESIGN_SYSTEM.primaryPurple }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c-3.87 0-7 3.13-7 7v5h10v-5c0-3.87-3.13-7-7-7zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
            Display
          </h3>

          <div style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "12px",
            color: DESIGN_SYSTEM.mutedGrey,
          }}>
            <p>Resolution: Auto-detect (recommended)</p>
            <p>Scaling: Fit to screen</p>
          </div>
        </section>

        <section style={{
          backgroundColor: DESIGN_SYSTEM.surface,
          borderRadius: DESIGN_SYSTEM.borderRadius,
          border: `1px solid rgba(128, 128, 128, 0.2)`,
          padding: DESIGN_SYSTEM.spacingLarge,
        }}>
          <h3 style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "14px",
            fontWeight: DESIGN_SYSTEM.fontWeightMedium,
            color: DESIGN_SYSTEM.primaryPurple,
            margin: "0 0 16px 0",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: DESIGN_SYSTEM.primaryPurple }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c-3.87 0-7 3.13-7 7v5h10v-5c0-3.87-3.13-7-7-7zm0 9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
            </svg>
            About DOM Remote
          </h3>

          <div style={{
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "12px",
            color: DESIGN_SYSTEM.mutedGrey,
          }}>
            <p>Version 1.0.0</p>
            <p>Premium Dark design system</p>
            <p>Windows laptop remote access</p>
          </div>
        </section>

        <button
          onClick={onDisconnect}
          style={{
            width: "100%",
            marginTop: DESIGN_SYSTEM.spacingLarge,
            background: "none",
            border: "1px solid rgba(128, 128, 128, 0.3)",
            borderRadius: "6px",
            padding: DESIGN_SYSTEM.spacingMedium,
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "14px",
            fontWeight: DESIGN_SYSTEM.fontWeightMedium,
            color: DESIGN_SYSTEM.mutedGrey,
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}