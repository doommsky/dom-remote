# Operator Runbook

## Deploy Backend (Fly.io)
See [fly-deploy-runbook.md](./fly-deploy-runbook.md).

## Deploy Frontend (Cloudflare Pages)
See [deploy-frontend.md](./deploy-frontend.md).

## Secrets
Set via `fly secrets set`:
- JWT_SECRET
- SENTRY_DSN
- SLACK_WEBHOOK_URL
- ALERT_WEBHOOK_URL

## Monitoring
- /health endpoint: `curl https://<app>.fly.dev/health`
- Sentry: errors captured when SENTRY_DSN set
- Slack alerts: sent when SLACK_WEBHOOK_URL or ALERT_WEBHOOK_URL set

## Rollback
- `fly releases rollback <version>`
- or `git revert <sha>` + redeploy

## Cross-references
- [Deployment](./deployment.md)
- [Observability](./observability.md)
- [Android Release](./android-release.md)