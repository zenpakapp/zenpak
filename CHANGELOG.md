# Changelog

All notable changes to ZenPak are documented here.

---

## [Unreleased] — 2026-07-07

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
- **Public profile** at `/@username` — display name, bio, trail name, avatar, tier badge, gear philosophy (Wayfarer tier)
- **Public list page** — weight chart (donut), share controls, copy button, downloadable toggle
- **Visibility levels** — private / shareable / discoverable / indexable per profile

### User tiers (Base / Kin / Wayfarer)
- **Kin** — badge on public profile, locked slot shown on own profile
- **Wayfarer** — affiliate links + promo codes with rules per brand/shop/domain, `/guide` dashboard with insights, upsell zones in dashboard
- **Upgrade prompts** — inline and modal variants, redirects for locked routes

### Gear & packing
- **Packing mode** — checkbox per item, progress bar, completion modal, persisted in localStorage
- **Gear Room (Item Library)** — full-viewport table with filters, batch actions (swap, move, tag, delete), comparison panel, orphan filter, star/favorite, merge duplicates, used-in badges
- **Item detail** — image upload via Cloudinary (optimised at 800 px, `q_auto f_auto`), gear scraper, direct edit mode
- **Smart Library** — insights endpoint powering Wayfarer dashboard

### Profile & settings
- **Avatar upload** — Cloudinary (`200×200`, face crop, `q_auto f_auto`), remove button with immediate server persistence
- **Random avatar** — hash-based HSL color + initials for users without a photo (free tier)
- **Public profile settings** — display name, trail name, bio, visibility, search indexing toggle — saved via `PUT /api/profile`, available to all users; avatar/bio/trail name gated behind Kin+
- **Default units** — item weight, list totals, currency symbol

### App & UX
- **Dark mode** — theme toggle in navbar, CSS vars propagated to all surfaces including charts
- **`/about` page** — Ko-fi CTA, interest form, rewritten as canonical founder page
- **Welcome page** — conversion-first redesign, `Create account` dominant, `Sign in` secondary, `Skip account` link
- **CSV** — description field in export/import, protection on download, dedup on import
- **Import from URL** — import a list directly from a LighterPack URL
- **Import from text** — paste gear list as plain text, parsed into items
- **Legal pages** — `/privacy`, `/terms`, `/legal` (LCEN compliance)
- **Billing** — Stripe checkout + customer portal, plan-aware UI, cancel banner, trial awareness

### Internationalisation (i18n Phase 1 + 2)
- **vue-i18n@9** — installed, browser-language auto-detection, localStorage override
- **Language selector** — in account settings, immediate locale switch without reload
- **EN/FR/DE/ES complete** — 500+ keys across all views and components, 100% parity
- **Migrated views** — dashboard, welcome, signin, register, list, share, list-summary, public-list, public-profile, about, community, feed, guide, item detail, gear room, account, upgrade prompts
- **Server-side Mustache** — `resolveLocale()`, `t_totals.mustache`, `embed.mustache`, `server/locales/` folder
- **hreflang meta tags** — `<teleport to="head">` on 3 public routes (`/u/:username`, `/list/:id`, `/community`)
- **Copy polish** — symmetric "Already a member / Not yet a member" kickers, welcome page copy rewritten across 4 locales, shortened button labels for long-form languages

### Stack modernisation
- **Vue 3** — full migration from Vue 2 (Composition API, `setup()`, composables)
- **Vite** — replaced Webpack as bundler
- **SCSS design tokens** — global variable system (`$color-*`, `$fontSize-*`, `$radius-*`) via `_globals.scss`, all surfaces migrated
- **Cloudinary** — shared helper for upload and automatic image optimisation
- **`mongojs` removed** — consolidated Mongo access layer, compatible with modern Node
- **`event-bus` / `navigation` services** — store decoupling, removed `window.bus` / `window.router` globals
- **ESM** — native imports on shared utilities
- **Chart.js v4.5.1** — replaced homegrown `pies.js`, interactive hover on all 3 donut surfaces

### Security & infrastructure
- **Auth** — `httpOnly: true, sameSite: 'lax'` on all session cookies
- **Image upload** — endpoint re-authenticated (was accidentally open)
- **ReDoS** — user input escaped before MongoDB `$regex` in discover and users search
- **Moderator config** — usernames stored in gitignored `config/local.json`, not in source
- **MongoDB indexes** — compound indexes on hot community queries
- **pm2 cluster mode** — multi-core utilisation
- **Billing guards** — plan checks on all Wayfarer-tier routes, non-blocking portal error logging
- **Restore endpoint** — `POST /api/restore` idempotent for all plans

---

*Started: June 2026 — Upstream: [lighterpack.com](https://lighterpack.com) open-source fork*
