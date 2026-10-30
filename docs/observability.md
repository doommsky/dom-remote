# Observability

- Structured JSON logs via auditLog.
- /health endpoint returns status.
- Error tracking provider: Sentry (SENTRY_DSN), no-op when unset.
- Alert destination: Slack incoming webhook (SLACK_WEBHOOK_URL / ALERT_WEBHOOK_URL), no-op when unset.

## Alert thresholds
- Error rate > 5% for 5m
- p95 latency > 2s
- Connection failures > 10/min