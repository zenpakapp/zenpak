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
- Healthcheck: `GET /healthz`

## Caddy

Example `/etc/caddy/Caddyfile`:

```caddyfile
your-domain.example {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy handles HTTPS certificates automatically. Keep Node bound to a private/local interface and expose only ports `80` and `443` publicly.

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
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

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
