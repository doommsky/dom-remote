# Fly.io Deploy Runbook

## Prerequisites
- `flyctl` installed and authenticated.
- Fly app created: `fly apps create dom-remote` (or `fly launch`).

## Set secrets
```bash
fly secrets set JWT_SECRET="change-me" SENTRY_DSN="https://..." SLACK_WEBHOOK_URL="https://hooks.slack.com/..." ALERT_WEBHOOK_URL="https://hooks.slack.com/..."
```

## Deploy
```bash
fly deploy
```

## Verify
```bash
fly status
fly logs
curl https://dom-remote.fly.dev/health
```

## Rollback
```bash
fly releases list
fly releases rollback <version>
```

No secrets are stored in the repo. All values come from Fly.io secrets.