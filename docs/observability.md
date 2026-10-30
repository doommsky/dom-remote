# Observability

- Structured JSON logs via auditLog.
- /health endpoint returns status.
- Error tracking hook placeholder: SENTRY_DSN env var.
- Alert webhook placeholder: ALERT_WEBHOOK_URL.

## Alert thresholds
- Error rate > 5% for 5m
- p95 latency > 2s
- Connection failures > 10/min