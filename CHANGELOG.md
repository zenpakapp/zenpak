# Changelog

All notable changes to LighterPack+ are documented here.

---

## [Unreleased]

### Community
- **Discover tab** — public lists browsable without account, paginated with cursor
- **People tab** — search users by username with visibility filter
- **My Feed tab** — activity feed from followed users (list published, updated, copied)
- **Follow system** — follow/unfollow any public profile, follower/following counts
- **Copy list** — duplicate a public list into your own gear library (rate-limited, client-side dedup)
- **Featured lists** — moderator toggle, dedicated section at top of Discover
- **Report system** — report button on any public list, moderation inbox with resolve/ban/unpublish actions
- **Notifications** — bell icon with unread badge, follow and copy events, per-type preference toggles

### Public profiles
- **Public profile** at `/@username` — display name, bio, trail name, avatar, tier badge, gear philosophy (Guide tier)
- **Public list page** — weight chart (donut), share controls, copy button, downloadable toggle
- **Visibility levels** — private / shareable / discoverable / indexable per profile

### User tiers (Base / Trail / Guide)
- **Trail** — badge on public profile, locked slot shown on own profile
- **Guide** — affiliate links + promo codes with rules per brand/shop/domain, `/guide` dashboard with insights, upsell zones in dashboard, interest form
- **Upgrade prompts** — inline and modal variants, redirects for locked routes

### Gear & packing
- **Packing mode** — checkbox per item, progress bar, completion modal, persisted in localStorage
- **Gear Room (Item Library)** — full-viewport table with filters, batch actions (swap, move, tag, delete), comparison panel, orphan filter, star/favorite, merge duplicates, used-in badges
- **Item detail** — image upload via Cloudinary (optimised at 800 px, `q_auto f_auto`), gear scraper, direct edit mode
- **Smart Library** — insights endpoint powering Guide dashboard

### Profile & settings
- **Avatar upload** — Cloudinary (`200×200`, face crop, `q_auto f_auto`), remove button with immediate server persistence
- **Public profile settings** — display name, trail name, bio, visibility, search indexing toggle
- **Default units** — item weight, list totals, currency symbol

### App & UX
- **Dark mode** — theme toggle in navbar, CSS vars propagated to all surfaces including charts
- **`/about` page** — Ko-fi CTA, interest form
- **Welcome page** — conversion-first redesign, `Create account` dominant, `Sign in` secondary, `Skip account` link
- **CSV** — description field in export/import, protection on download, dedup on import

### Stack modernisation
- **Vue 3** — migration complète depuis Vue 2 (Composition API, `setup()`, composables)
- **Vite** — remplacement de Webpack comme bundler
- **SCSS design tokens** — système de variables global (`$color-*`, `$fontSize-*`, `$radius-*`) via `_globals.scss`, toutes les surfaces migrées
- **Cloudinary** — helper partagé pour upload et optimisation automatique des images
- **`mongojs` retiré** — couche d'accès Mongo consolidée, compatible Node moderne
- **`event-bus` / `navigation` services** — découplage du store, suppression des globals `window.bus` / `window.router`
- **ESM** — imports natifs sur les utilitaires partagés

### Security & infrastructure
- **Auth** — `httpOnly: true, sameSite: 'lax'` on all session cookies
- **Image upload** — endpoint re-authenticated (was accidentally open)
- **ReDoS** — user input escaped before MongoDB `$regex` in discover and users search
- **Moderator config** — usernames stored in gitignored `config/local.json`, not in source
- **MongoDB indexes** — compound indexes on hot community queries
- **pm2 cluster mode** — multi-core utilisation

---

*Started: June 2026 — Upstream: [lighterpack.com](https://lighterpack.com) open-source fork*
