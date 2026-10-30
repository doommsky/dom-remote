async function sendSlackAlert(message) {
  const url = process.env.SLACK_WEBHOOK_URL || process.env.ALERT_WEBHOOK_URL;
  if (!url) return false;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: message }) });
    return true;
  } catch {
    return false;
  }
}

function captureError(err) {
  if (process.env.SENTRY_DSN) {
    console.error('[sentry]', err);
  } else {
    console.error(err);
  }
}

module.exports = { sendSlackAlert, captureError };