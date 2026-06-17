# ZenPak

> Pack light. Leave calm.

[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)

ZenPak is an open-source packing tool for hikers, travelers, pilgrims, cyclists, and anyone who wants to pack smarter. Built on the foundation of [LighterPack](https://github.com/galenmaly/lighterpack) by Galen Maly.

## Features

- **Gear library** — build a reusable catalog of your gear, weights, and photos
- **Pack lists** — organize by category, track base weight to the gram
- **Public sharing** — private, link-only, or discoverable by the community
- **Public profiles** — showcase your gear philosophy and featured lists
- **Community discover** — browse and copy lists from other packers
- **Image upload** — attach photos to any gear item
- **CSV import/export** — full round-trip fidelity with lighterpack.com

## Pricing (hosted service)

The app is free to use. Optional paid plans on **zenpak.app** (coming soon):

- **Trail** (~3 €/month) — full library export (JSON), enhanced public profile, supporter badge
- **Guide** (~8 €/month) — affiliate links, promo codes, and insights (views, copies, clicks)

Self-hosting remains fully free and open-source.

## Migrating from lighterpack.com

1. On lighterpack.com → **Settings → Export CSV**
2. Create an account on ZenPak
3. **Settings → Import CSV** — upload the file

Lists, items, weights, and notes carry over.

## Self-hosting

Requirements: Node.js, npm, MongoDB.

```bash
npm install
npm run dev
```

Open `http://localhost:8080`. MongoDB expected at `localhost/lighterpack`.

## License

Licensed under [GPL v2](LICENSE). Built from [LighterPack](https://github.com/galenmaly/lighterpack) by Galen Maly. Not affiliated with lighterpack.com.
