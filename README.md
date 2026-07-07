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
- **Self-hosting** — full functionality, no account required

## Migrating from lighterpack.com

```
1. lighterpack.com → Settings → Export CSV
2. Create a ZenPak account
3. Settings → Import CSV
```

Or paste any public lighterpack.com list URL directly into the import dialog. Lists, items, weights, and categories carry over.

## Self-hosting

Requires Node.js 18+, npm, MongoDB 6+.

```bash
git clone https://github.com/fxbenard/lighterpack
cd lighterpack
npm install
cp config/default.json config/local.json
npm run dev
```

`http://localhost:8080` — MongoDB at `localhost/lighterpack` by default.

Stripe, email, and S3 are optional. Everything in `config/default.json`.

## Plans

Free on **zenpak.app**, free to self-host.

| | **Kin** | **Wayfarer** |
|--|---------|--------------|
| Price | ~3 €/mo | ~8 €/mo |
| JSON export | ✓ | ✓ |
| Enhanced profile + badge | ✓ | ✓ |
| Affiliate links + promo codes | | ✓ |
| Insights (views, copies, clicks) | | ✓ |

Plans support the project. Self-hosting is always fully functional.

## License

[GPL v2](LICENSE). Not affiliated with lighterpack.com.
