// DOM Remote - Premium Dark Remote Access App
// Style A: Premium Dark - deep navy and near-black, electric purple accents

const DESIGN_SYSTEM = {
  background: "#0B0D18",
  surface: "#171B2A",
  primaryPurple: "#7C3AED",
  onlineGreen: "#4ADE80",
  mutedGrey: "#6B7280",
  errorRed: "#EF4444",
  fontFamily: "'Inter', 'system-ui', sans-serif",
  fontSize: "14px",
  fontWeightMedium: 500,
  fontWeightBold: 600,
  borderRadius: "8px",
  spacingSmall: "4px",
  spacingMedium: "8px",
  spacingLarge: "16px",
  spacingXLarge: "24px",
};

export default function App({ input, hostContext, result }) {
  const theme = hostContext?.styles?.variables ?? {};
  const scheme = hostContext?.theme ?? "light dark";
  const colorScheme = { ...theme, colorScheme: scheme };

  const [screen, setScreen] = React.useState("home");
  const [laptop, setLaptop] = React.useState(null);
  const [connection, setConnection] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [showConnecting, setShowConnecting] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("dom-remote-laptop");
    if (saved) {
      setLaptop(JSON.parse(saved));
    }
  }, []);

  const handleConnect = () => {
    if (!laptop) {
      setError("No laptop selected. Please ensure the laptop agent is running.");
      return;
    }
    setShowConnecting(true);
    setError(null);
    const isAvailable = laptop && laptop.name && laptop.name.length > 0;
    if (isAvailable) {
      setConnection({
        laptopId: laptop.id || "laptop-1",
        startedAt: new Date(),
        status: "connected",
      });
      setScreen("remote");
      localStorage.setItem("dom-remote-laptop", JSON.stringify(laptop));
    } else {
      setError("Failed to connect to laptop. Is it online and the agent running?");
    }
    setShowConnecting(false);
  };

  const handleDisconnect = () => {
    setConnection(null);
    setScreen("home");
    localStorage.removeItem("dom-remote-laptop");
  };

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
  const laptopOnline = laptop?.online ?? true;
  const laptopName = laptop?.name ?? "My Laptop";
  const laptopStatus = laptopOnline ? "Online · Ready to connect" : "Offline";
  const bgColor = DESIGN_SYSTEM.background;
  const surfaceColor = DESIGN_SYSTEM.surface;
  const purpleAccent = DESIGN_SYSTEM.primaryPurple;
  const onlineGreen = DESIGN_SYSTEM.onlineGreen;
  const mutedGrey = DESIGN_SYSTEM.mutedGrey;
  const errorRed = DESIGN_SYSTEM.errorRed;

  return React.createElement(
    "main",
    { className: "app", style: { ...colorScheme, backgroundColor: bgColor, color: onlineGreen } },
    React.createElement(
      "div",
      { className: "container", style: { maxWidth: "420px", padding: DESIGN_SYSTEM.spacingXLarge } },
      React.createElement(
        "header",
        { style: { textAlign: "center", marginBottom: DESIGN_SYSTEM.spacingXLarge } },
        React.createElement(
          "h1",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "20px",
              fontWeight: DESIGN_SYSTEM.fontWeightBold,
              margin: 0,
              color: onlineGreen,
            },
          },
          "DOM Remote"
        ),
        React.createElement(
          "p",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "12px",
              color: mutedGrey,
              margin: "8px 0 0 0",
            },
          },
          "Personal remote access"
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            backgroundColor: surfaceColor,
            borderRadius: DESIGN_SYSTEM.borderRadius,
            border: "1px solid rgba(128, 128, 128, 0.2)",
            padding: DESIGN_SYSTEM.spacingLarge,
            marginBottom: DESIGN_SYSTEM.spacingLarge,
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  fontFamily: DESIGN_SYSTEM.fontFamily,
                  fontSize: "14px",
                  fontWeight: DESIGN_SYSTEM.fontWeightMedium,
                  color: onlineGreen,
                  marginBottom: DESIGN_SYSTEM.spacingSmall,
                },
              },
              laptopName
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontFamily: DESIGN_SYSTEM.fontFamily,
                  fontSize: "12px",
                  color: mutedGrey,
                },
              },
              laptopStatus
            )
          ),
          React.createElement(
            "div",
            {
              style: {
                color: laptopOnline ? onlineGreen : mutedGrey,
                fontSize: "20px",
              },
            },
            "●"
          )
        )
      ),
      error && React.createElement(
        "div",
        {
          style: {
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid #EF4444",
            borderRadius: "4px",
            padding: DESIGN_SYSTEM.spacingMedium,
            marginTop: DESIGN_SYSTEM.spacingMedium,
            color: errorRed,
            fontSize: "12px",
          },
        },
        error
      ),
      showConnecting && React.createElement(
        "div",
        {
          style: {
            textAlign: "center",
            marginTop: DESIGN_SYSTEM.spacingLarge,
          },
        },
        React.createElement("div", {
          style: {
            width: 32,
            height: 32,
            border: "3px solid #7C3AED",
            borderRadius: "50%",
            margin: "0 auto 12px auto",
            animation: "spin 1s linear infinite",
          },
        }),
        React.createElement(
          "p",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              color: onlineGreen,
            },
          },
          "Connecting to " + laptopName + "..."
        )
      ),
      React.createElement(
        "button",
        {
          onClick: onConnect,
          style: {
            width: "100%",
            backgroundColor: purpleAccent,
            border: "none",
            borderRadius: "6px",
            padding: DESIGN_SYSTEM.spacingMedium,
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "15px",
            fontWeight: DESIGN_SYSTEM.fontWeightMedium,
            color: "#FFFFFF",
            cursor: "pointer",
            marginTop: DESIGN_SYSTEM.spacingSmall,
          },
          disabled: showConnecting,
        },
        showConnecting ? "Connecting..." : "Connect"
      ),
      React.createElement(
        "p",
        {
          style: {
            marginTop: DESIGN_SYSTEM.spacingLarge,
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "12px",
            color: mutedGrey,
            textAlign: "center",
          },
        },
        "One-tap connect for trusted devices"
      )
    )
  );
}

function renderRemoteScreen(connection, onDisconnect, onError, onClearError) {
  const onlineGreen = DESIGN_SYSTEM.onlineGreen;
  const mutedGrey = DESIGN_SYSTEM.mutedGrey;
  const errorRed = DESIGN_SYSTEM.errorRed;
  const surfaceColor = DESIGN_SYSTEM.surface;

  return React.createElement(
    "main",
    { className: "app", style: { ...colorScheme, backgroundColor: DESIGN_SYSTEM.background, color: onlineGreen } },
    React.createElement(
      "div",
      { className: "container", style: { maxWidth: "800px", padding: DESIGN_SYSTEM.spacingXLarge } },
      React.createElement(
        "header",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: DESIGN_SYSTEM.spacingLarge,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: DESIGN_SYSTEM.spacingMedium,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                color: onlineGreen,
                fontSize: "24px",
              },
            },
            "●"
          ),
          React.createElement(
            "span",
            {
              style: {
                fontFamily: DESIGN_SYSTEM.fontFamily,
                fontSize: "18px",
                fontWeight: DESIGN_SYSTEM.fontWeightBold,
                color: onlineGreen,
              },
            },
            "Remote Desktop"
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: DESIGN_SYSTEM.spacingMedium,
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontFamily: DESIGN_SYSTEM.fontFamily,
                fontSize: "13px",
                color: mutedGrey,
              },
            },
            connection
              ? "Connected since " + (connection.startedAt ? new Date(connection.startedAt).toLocaleTimeString() : "unknown")
              : "Disconnected"
          ),
          React.createElement(
            "button",
            {
              onClick: onDisconnect,
              style: {
                background: "none",
                border: "none",
                color: errorRed,
                fontFamily: DESIGN_SYSTEM.fontFamily,
                fontSize: "13px",
                cursor: "pointer",
                padding: 0,
              },
            },
            "Disconnect"
          )
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            backgroundColor: surfaceColor,
            borderRadius: DESIGN_SYSTEM.borderRadius,
            overflow: "hidden",
            marginBottom: DESIGN_SYSTEM.spacingLarge,
            border: "1px solid rgba(128, 128, 128, 0.2)",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              position: "relative",
              width: "100%",
              height: 400,
              backgroundColor: "#000",
              overflow: "hidden",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(135deg, #1a1f2f 0%, #0b0d18 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: mutedGrey,
                fontSize: "14px",
              },
            },
            React.createElement("p", null, "Windows Desktop Stream"),
            React.createElement(
              "p",
              { style: { margin: "8px 0 0 0" } },
              "• Mouse touch mode • Keyboard • Fullscreen"
            )
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: "rgba(74, 222, 128, 0.2)",
              border: "1px solid #4ADE80",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "10px",
              color: "#4ADE80",
            },
          },
          "✓ " + (connection?.status || "Connecting")
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            backgroundColor: surfaceColor,
            borderRadius: DESIGN_SYSTEM.borderRadius,
            border: "1px solid rgba(128, 128, 128, 0.2)",
            padding: DESIGN_SYSTEM.spacingMedium,
            display: "flex",
            gap: DESIGN_SYSTEM.spacingSmall,
            alignItems: "center",
            flexWrap: "wrap",
          },
        },
        React.createElement(
          "button",
          {
            style: {
              background: "none",
              border: "none",
              color: onlineGreen,
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            },
          },
          "Mouse mode"
        ),
        React.createElement(
          "button",
          {
            style: {
              background: "none",
              border: "none",
              color: onlineGreen,
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            },
          },
          "Keyboard"
        ),
        React.createElement(
          "button",
          {
            style: {
              background: "none",
              border: "none",
              color: onlineGreen,
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            },
          },
          "Fullscreen"
        ),
        React.createElement(
          "button",
          {
            onClick: onDisconnect,
            style: {
              background: "none",
              border: "1px solid #EF4444",
              borderRadius: "6px",
              color: "#EF4444",
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "13px",
              cursor: "pointer",
              padding: DESIGN_SYSTEM.spacingSmall,
            },
          },
          "Disconnect"
        )
      )
    )
  );
}

function renderSettingsScreen(onDisconnect) {
  const onlineGreen = DESIGN_SYSTEM.onlineGreen;
  const mutedGrey = DESIGN_SYSTEM.mutedGrey;
  const primaryPurple = DESIGN_SYSTEM.primaryPurple;
  const surfaceColor = DESIGN_SYSTEM.surface;

  return React.createElement(
    "main",
    { className: "app", style: { ...colorScheme, backgroundColor: DESIGN_SYSTEM.background, color: onlineGreen } },
    React.createElement(
      "div",
      { className: "container", style: { maxWidth: "420px", padding: DESIGN_SYSTEM.spacingXLarge } },
      React.createElement(
        "h2",
        {
          style: {
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "18px",
            fontWeight: DESIGN_SYSTEM.fontWeightBold,
            color: onlineGreen,
            marginBottom: DESIGN_SYSTEM.spacingLarge,
          },
        },
        "Settings"
      ),
      React.createElement(
        "section",
        {
          style: {
            backgroundColor: surfaceColor,
            borderRadius: DESIGN_SYSTEM.borderRadius,
            border: "1px solid rgba(128, 128, 128, 0.2)",
            padding: DESIGN_SYSTEM.spacingLarge,
            marginBottom: DESIGN_SYSTEM.spacingLarge,
          },
        },
        React.createElement(
          "h3",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "14px",
              fontWeight: DESIGN_SYSTEM.fontWeightMedium,
              color: primaryPurple,
              margin: "0 0 16px 0",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                color: primaryPurple,
                fontSize: "16px",
              },
            },
            "🔒"
          ),
          "Security"
        ),
        React.createElement(
          "div",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "12px",
              color: mutedGrey,
            },
          },
          React.createElement("p", null, "Trusted devices: " + (localStorage.getItem("dom-remote-trusted") || "None saved")),
          React.createElement("p", null, "Authentication: Encrypted session"),
          React.createElement("p", null, "Connection: Secure relay when needed")
        )
      ),
      React.createElement(
        "section",
        {
          style: {
            backgroundColor: surfaceColor,
            borderRadius: DESIGN_SYSTEM.borderRadius,
            border: "1px solid rgba(128, 128, 128, 0.2)",
            padding: DESIGN_SYSTEM.spacingLarge,
            marginBottom: DESIGN_SYSTEM.spacingLarge,
          },
        },
        React.createElement(
          "h3",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "14px",
              fontWeight: DESIGN_SYSTEM.fontWeightMedium,
              color: primaryPurple,
              margin: "0 0 16px 0",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                color: primaryPurple,
                fontSize: "16px",
              },
            },
            "🖥️"
          ),
          "Display"
        ),
        React.createElement(
          "div",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "12px",
              color: mutedGrey,
            },
          },
          React.createElement("p", null, "Resolution: Auto-detect (recommended)"),
          React.createElement("p", null, "Scaling: Fit to screen")
        )
      ),
      React.createElement(
        "section",
        {
          style: {
            backgroundColor: surfaceColor,
            borderRadius: DESIGN_SYSTEM.borderRadius,
            border: "1px solid rgba(128, 128, 128, 0.2)",
            padding: DESIGN_SYSTEM.spacingLarge,
          },
        },
        React.createElement(
          "h3",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "14px",
              fontWeight: DESIGN_SYSTEM.fontWeightMedium,
              color: primaryPurple,
              margin: "0 0 16px 0",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                color: primaryPurple,
                fontSize: "16px",
              },
            },
            "ℹ️"
          ),
          "About DOM Remote"
        ),
        React.createElement(
          "div",
          {
            style: {
              fontFamily: DESIGN_SYSTEM.fontFamily,
              fontSize: "12px",
              color: mutedGrey,
            },
          },
          React.createElement("p", null, "Version 1.0.0"),
          React.createElement("p", null, "Premium Dark design system"),
          React.createElement("p", null, "Windows laptop remote access")
        )
      ),
      React.createElement(
        "button",
        {
          onClick: onDisconnect,
          style: {
            width: "100%",
            marginTop: DESIGN_SYSTEM.spacingLarge,
            background: "none",
            border: "1px solid rgba(128, 128, 128, 0.3)",
            borderRadius: "6px",
            padding: DESIGN_SYSTEM.spacingMedium,
            fontFamily: DESIGN_SYSTEM.fontFamily,
            fontSize: "14px",
            fontWeight: DESIGN_SYSTEM.fontWeightMedium,
            color: mutedGrey,
            cursor: "pointer",
          },
        },
        "Back to Home"
      )
    )
  );
}