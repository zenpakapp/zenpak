# ZenPak

> Pack light. Leave calm.

[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)

Open-source gear list tool for ultralight hikers. Build a reusable gear library, organize pack lists by category, track base weight to the gram. Share publicly or keep it private.

No gear database. No pricing suggestions. You manage your gear.

Built on [LighterPack](https://github.com/galenmaly/lighterpack) by Galen Maly — actively maintained fork with community features, creator tools, and a billing layer to keep the hosted version alive.

## Features

- **Gear library** — reusable catalog with weights, photos, tags
- **Pack lists** — organize by category, real-time weight chart
- **Season and activity tags** — tag lists as 3-Season, Thru-hike, Winter Camping, Ultralight…
- **Community discover** — browse public lists, filter by season, type, and base weight
- **Public profiles** — gear philosophy, linked lists, follow system
- **Packing mode** — check items off as you pack
- **Import from lighterpack.com** — paste a URL or upload a CSV
- **Creator tools** — affiliate links, promo codes, view/copy insights (Guide plan)
- **Multi-language** — English, French, German, Spanish — browser-detected or manually set in account settings
- **Self-hosting** — full functionality, no account required

## Migrating from lighterpack.com

```
1. lighterpack.com → Settings → Export CSV
2. Create a ZenPak account
3. Settings → Import CSV
```

Or paste any public lighterpack.com list URL directly into the import dialog. Lists, items, weights, and categories carry over.

## Self-hosting

**Requirements:** Node.js 18+, MongoDB 6+

```bash
git clone https://github.com/zenpakapp/zenpak
cd zenpak
npm install
cp config/default.json config/local.json
# edit config/local.json (see below)
npm run dev      # dev server → http://localhost:8080
npm run start    # production build + start → http://localhost:3000
```

**Minimum config** (`config/local.json`):

```json
{
  "environment": "production",
  "databaseUrl": "mongodb://localhost/zenpak",
  "deployUrl": "https://your-domain.com",
  "publicUrl": "https://your-domain.com",
  "port": 3000
}
```

**Optional services** — leave fields empty to disable:

| Service | Config keys | Purpose |
|---------|-------------|---------|
| Mailgun | `mailgunDomain`, `mailgunAPIKey`, `mailgunBaseURL` | Email verification, password reset |
| Cloudinary | `cloudinaryCloudName`, `cloudinaryApiKey`, `cloudinaryApiSecret` | Item image uploads |
| Google OAuth | `googleClientId`, `googleClientSecret`, `googleCallbackUrl` | Sign in with Google |

**Billing:** Leave all `stripe*` and `kofiWebhookToken` fields empty. The full app runs without billing — no feature gates apply in self-hosted mode. Paid plans (Kin, Wayfarer) are hosted-only at zenpak.app.

## Plans

Free on **zenpak.app**, free to self-host.

| | **Kin** | **Wayfarer** |
|--|---------|--------------|
| Price | €19/year | €5/mo or €39/year |
| Enhanced profile + badge | ✓ | ✓ |
| Managed backups | ✓ | ✓ |
| Affiliate links + promo codes | | ✓ |
| Insights (views, copies, clicks) | | ✓ |

Plans support the project. Self-hosting is always fully functional.

## License

[GPL v2](LICENSE). Not affiliated with lighterpack.com.
