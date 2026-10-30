# Frontend Deploy (Cloudflare Pages)

## Build
```bash
npm run build
```
Output: `dist/`

## Env vars (Cloudflare Pages)
- VITE_API_URL
- VITE_SIGNALING_URL

## Deploy
Connect repo to Cloudflare Pages or use `wrangler pages deploy dist`.

## Rollback
Redeploy previous build.