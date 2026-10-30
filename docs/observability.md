# Observability

- Structured JSON logs via auditLog.
- /health endpoint returns status.
- Error tracking provider: Sentry (SENTRY_DSN).
- Alert destination: Slack incoming webhook (SLACK_WEBHOOK_URL / ALERT_WEBHOOK_URL).

## Alert thresholds
- Error rate > 5% for 5m
- p95 latency > 2s
- Connection failures > 10/min