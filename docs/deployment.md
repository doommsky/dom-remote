# Deployment

## Host
Fly.io (app: dom-remote)

## Deploy
fly deploy

## Rollback
- fly releases rollback
- or git revert <sha> && fly deploy

## Env
See `.env.example`. Set secrets via `fly secrets set`.