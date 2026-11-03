# Self-Hosting Production Runbook

This runbook describes a small production deployment for a self-hosted ZenPak instance. It intentionally uses generic domains, paths, buckets, and environment variable names.

## Shape

- One Ubuntu LTS server for the Node app
- Caddy for TLS
- `systemd` for the Node process
- MongoDB outside the app server
- Object storage for logical backups

## Runtime

- Node.js: `22` from `.nvmrc`
- App port: `3000` internally
- Public ports: `80`, `443`
- Healthcheck: `GET /healthz` (200 when MongoDB answers, 503 when it does not)
- One Node process under `systemd`. Do not use `npm run pm2` in production: the rate limiters count in each process's own memory, so several processes multiply the limits.

## Configuration and secrets

The app reads its settings with `node-config`, not from plain environment variables. Only `NODE_ENV`, `PORT`, `DEPLOY_URL` and `TRUST_PROXY` are read directly from the environment.

Put every other setting (database, Stripe, Resend, Cloudinary, Google, analytics) in **one JSON object in `NODE_CONFIG`**, inside the file named by `EnvironmentFile`:

```bash
# /etc/zenpak/zenpak.env  (chmod 600, owner root)
NODE_CONFIG='{"deployUrl":"https://your-domain.example","publicUrl":"https://your-domain.example","bindings":["127.0.0.1"],"databaseUrl":"mongodb+srv://USER:PASSWORD@HOST/zenpak?tls=true&authSource=admin","resendAPIKey":"...","stripeSecretKey":"...","stripeWebhookSecret":"...","stripePriceIdTrailAnnual":"...","stripePriceIdGuide":"...","stripePriceIdGuideAnnual":"...","stripePortalConfigurationId":"...","cloudinaryCloudName":"...","cloudinaryApiKey":"...","cloudinaryApiSecret":"...","googleClientId":"...","googleClientSecret":"...","googleCallbackUrl":"https://your-domain.example/api/auth/google/callback","moderators":["..."]}'
```

- Keep it on one line, wrapped in single quotes. After the first start, check that systemd read it whole: `systemctl show zenpak -p Environment`, then `curl /healthz`.
- `bindings` makes Node listen on the loopback address only. Without it the default listens on every interface.
- `deployUrl` must start with `https://`: it turns on secure cookies.
- `databaseUrl` is either `host/dbname` or a full connection string (`mongodb://…` or `mongodb+srv://…`) ending with `/<database name>`. A string without a database name is refused at start.
- Never put these values in the repository. Keep an encrypted copy in a password manager.
- Dev keys (`config/local.json`) are not for production. Use the live Stripe keys, a Google OAuth client with the production callback URL, and a Cloudinary account you choose on purpose.
- The app creates its MongoDB indexes at start, on an empty database too.

## Caddy

Example `/etc/caddy/Caddyfile`:

```caddyfile
your-domain.example {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy handles HTTPS certificates automatically. Keep Node bound to a private/local interface and expose only ports `80` and `443` publicly.

### Proxies in front of the app (`TRUST_PROXY`)

The app reads the visitor's address from `X-Forwarded-For`, and the rate limiters use it. It trusts as many proxy hops as you tell it:

- Unset, `NODE_ENV=production`: one proxy (the Caddy above). Right for this setup.
- Unset, any other environment: none. `req.ip` is the connection address.
- `TRUST_PROXY=2`: two proxies, for example a CDN in front of Caddy.
- `TRUST_PROXY=false`: none. Use it when Node is exposed without a proxy.

Never leave a higher number than the proxies you really run: the extra hop would let a visitor write their own address. The same value can be set as `trustProxy` in the config file.

## systemd service

Create `/etc/systemd/system/zenpak.service`:

```ini
[Unit]
Description=ZenPak
After=network.target

[Service]
Type=simple
User=zenpak
WorkingDirectory=/var/www/zenpak
Environment=NODE_ENV=production
EnvironmentFile=/etc/zenpak/zenpak.env
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

`npm run start` is not used here: it rebuilds the front end on every restart. The build runs once in the deploy steps below. Use the absolute path of the `node` that `nvm use` selects if `/usr/bin/node` is not Node 22.

Apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl enable zenpak
sudo systemctl restart zenpak
sudo systemctl status zenpak
```

## Deploy

```bash
cd /var/www/zenpak
git fetch origin
git checkout main
git pull --ff-only origin main
nvm use
npm ci
npm run build
sudo systemctl restart zenpak
curl -fsS https://your-domain.example/healthz
```

After `/healthz`, verify login, one public list, and any enabled integrations.

## Rollback

Use this when a deploy breaks auth, list loading, public lists, or enabled integrations.

```bash
cd /var/www/zenpak
git fetch origin
git checkout <known-good-sha>
nvm use
npm ci
npm run build
sudo systemctl restart zenpak
curl -fsS https://your-domain.example/healthz
```

Restore database backups only for data corruption or a destructive migration.

A restore also brings back accounts deleted since the backup. Backups are kept at most 12 months, and the privacy policy and terms say so.

## MongoDB logical backup

Managed database backups should remain the first restore path. Add logical dumps to object storage for operator-controlled recovery.

```bash
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /var/backups/zenpak
mongodump "$MONGODB_URI" --archive="/var/backups/zenpak/zenpak-$STAMP.archive.gz" --gzip
aws s3 cp "/var/backups/zenpak/zenpak-$STAMP.archive.gz" "s3://your-backup-bucket/mongodb/daily/zenpak-$STAMP.archive.gz" --endpoint-url "$S3_ENDPOINT"
```

Suggested retention:

- daily: 7 days
- weekly: 4 weeks
- monthly: 6-12 months

## Restore test

Run monthly against a temporary database, never directly against production.

```bash
mongorestore "$MONGODB_RESTORE_URI" --archive="/path/to/zenpak.archive.gz" --gzip --drop
```

Confirm the app can start against the restored database before considering backups valid.
