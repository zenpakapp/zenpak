# CODEMAP — ZenPak (lighterpack)

> Architecture index. Update when structure changes. Not a substitute for reading code.

**Stack:** Node.js + Express · Vue 3 (Options API + Vuex) · MongoDB · Webpack 5 · SCSS · Playwright  
**Last mapped:** 2026-07-29

---

## Data Model

```
Library
  └─ items[]          ← gear room (all user items, flat)
  └─ lists[]
       └─ categoryIds[]
            └─ Category
                 └─ categoryItems[]  ← { itemId, qty, worn, consumable, star }
  └─ idMap            ← Map<id, item|list|category> for O(1) lookup
```

```
Public community projections
  └─ public_lists          ← denormalized public list cards/search data
  └─ public_list_stats     ← view/copy/click counters per public list
  └─ public_list_viewers   ← viewer dedupe keys for unique public views
```

**Weight:** stored internally as **milligrams** (integer). Display via `WeightToMg` / `MgToWeight` in `client/utils/weight.js`.  
**Units:** `itemUnit` (per-item display) · `totalUnit` (totals bar) — both on `Library`.  
**Plans (3-layer naming):**
- DB: `supporter` / `creator`
- API: `trail` / `guide`  
- UI: **Kin** / **Wayfarer**

---

## Key Files

### Client entry

| File | Role |
|------|------|
| `client/lighterpack.js` | Bootstrap — creates Vue router, `store.dispatch('init')`, mounts `#lp` |
| `client/routes.js` | 18 SPA routes (path → view component) |
| `client/i18n.js` | vue-i18n: locale from localStorage → navigator → `'en'` |
| `client/dataTypes.js` | Model barrel re-exported to both client and server |

### Vuex store

| File | Role |
|------|------|
| `client/store/store.js` | State shape, `activeList` getter, `init`/`loadRemote`/`loadLocal` actions, **debounced 10s auto-save** |
| `client/store/mutations-library.js` | All gear/list/category CRUD: `newItem`, `removeItem`, `updateItem`, `reorderItem`, `copyList`, etc. |
| `client/store/mutations-session.js` | Auth state, `loadLibraryData`, `setLoggedIn`, `pushGlobalAlert`, billing flags |
| `client/store/mutations-import.js` | `importCSV` and `importPublicList` with dedup/merge logic |

### Models

| File | Role |
|------|------|
| `client/models/library.js` | Top-level model — `load()` / `save()` / `upgrade()` migrations / `nextSequence()` / `idMap` |
| `client/models/list.js` | `calculateTotals()` · `renderChart()` · `forkedFrom` lineage field |
| `client/models/category.js` | `calculateSubtotal()` · worn uses qty=1 · consumable uses full qty |
| `client/models/item.js` | Gear fields — `load()` normalizes price/weight types |

### Utils & Services

| File | Role |
|------|------|
| `client/utils/weight.js` | `WeightToMg(value, unit)` / `MgToWeight(value, unit)` |
| `client/utils/utils.js` | `fetchJson()` (throws `lpError` with statusCode) · `arrayMove()` |
| `client/services/dialogs.js` | Named dialog registry — `registerDialogOpener(name, fn)` / `openDialog(name, ...args)` |
| `client/services/entitlements.js` | Plan constants · feature constants · `hasFeature(entitlements, FEATURES.X)` |
| `client/services/public-visibility.js` | Visibility: `private` → `shareable` → `discoverable` → `indexable` |
| `client/services/browser-storage.js` | localStorage helpers for offline library |
| `client/composables/usePackingMode.js` | Singleton packing-mode state, persisted to localStorage per list |
| `client/composables/useGearMatcher.js` | Levenshtein-based gear dedup scoring for CSV import |
| `client/composables/useGearRoomFilters.js` | Filter/sort state for gear room |

### Components (most-touched)

| File | Role |
|------|------|
| `client/components/item.vue` | Item row — inline name/weight/qty/price, action icons, double-click → detail |
| `client/components/category.vue` | Category row — item list, drag handles, subtotals, add-item autocomplete |
| `client/components/list.vue` | List body — categories, packing bar, description textarea |
| `client/components/sidebar.vue` | Settings panel — lists nav, unit selectors, optional fields toggles |
| `client/components/gear-room.vue` | Gear library panel — search/filter, batch ops, compare |
| `client/components/item-detail.vue` | Modal orchestrator — switches view/edit via `editing` boolean |
| `client/components/item-detail-edit.vue` | Editable item form — all fields, `updateItem` mutation |
| `client/components/item-add-to-list.vue` | "Ajouter à…" dialog — add gear room item to a category |
| `client/components/item-detail-header.vue` | Item detail header — star toggle i18n via `item.addToFavorites` |
| `client/components/import-csv.vue` | CSV import wizard — file picker, column mapping, merge UI |
| `client/components/list-settings.vue` | Share/visibility settings dialog |

### Server

| File | Role |
|------|------|
| `app.js` | Express entry — middleware, routes, webpack dev integration |
| `server/endpoints.js` | Central router — assembles all sub-routers |
| `server/views.js` | SPA shell + server-rendered `/r/:id` (share), `/e/:id` (embed), `/csv/:id` |
| `server/auth.js` | `authenticateUser()` · bcrypt + legacy SHA3 migration · `generateSession()` |
| `server/auth-endpoints.js` | `/register` · `/signin` · `/forgotPassword` · `/resetPassword` · `/verify-email` |
| `server/library-endpoints.js` | `POST /saveLibrary` (syncToken, server-fields protection) · backup/restore · LP importer |
| `server/community-endpoints.js` | Discover · follow · feed · copy-list (rate-limited) |
| `server/public-list-projections.js` | Builds/syncs `public_lists`, converts projections to Discover items, updates public stats/viewers |
| `server/public-sharing.js` | `buildPublicList()` · `buildPublicProfile()` — sanitize before public API |
| `server/billing.js` | Stripe: `getOrCreateCustomer()` · `syncUserBilling()` · plan/price mapping |
| `server/billing-endpoints.js` | `/api/billing/*` — checkout-session · portal-session · config · me · cancel |
| `server/webhook-handler.js` | Stripe + Ko-fi webhooks — raw body, signature verify, idempotency |
| `server/db.js` | MongoDB wrapper — `collection()` factory, named collections, `ensureIndexes()` |
| `server/save-library-feed.js` | `detectVisibilityChanges()` — emits feed events on list publish/update |
| `server/gear-scraper.js` | `scrapeGear(url)` — fetches og-tags / structured data for item auto-fill |

### Scripts

| File | Role |
|------|------|
| `scripts/backfill-public-lists.js` | Rebuilds `public_lists`, migrates legacy public stats/viewers, removes stale projections |

### i18n

4 locales: `client/locales/{fr,en,de,es}.json`  
Key prefix: `item.` for item-level strings.  
Recent keys: `item.addToListButtonText` · `item.addToFavorites` · `item.removeFromFavorites`

### CSS

Design tokens in `client/css/_globals.scss` (CSS custom properties, light + dark via `@media` + `:root[data-theme]`).  
Entry: `client/css/lighterpack.scss` imports all partials.

---

## Data Flow: Load → Store → Save

```
Browser init
  store.dispatch('init')
    → POST /signin  → { library: JSON, syncToken, username }
      mutations-session: loadLibraryData(JSON)
        → new Library().load(parsed)  → state.library (reactive)
    → fallback: localStorage.library → loadLocal()

Component reads
  this.$store.state.library           (Library instance)
  this.$store.getters.activeList      (library.getListById(defaultListId))
  list.categoryIds → category.categoryItems → item (via idMap)

User edit
  this.$store.commit('updateItem', item)
    → library.updateItem(item)
    → list.calculateTotals()
    → state.itemVersion++  (forces re-render)

Auto-save plugin (store.js)
  store.subscribe() — debounced 10s, maxWait 30s
    → library.save() → JSON
    → compare to lastSaveData → skip if unchanged
    → POST /saveLibrary { syncToken, username, data }
      → server returns new syncToken
```

---

## Key Patterns

**Dialog system** — `dialogs.js`: component calls `registerDialogOpener('name', fn)` in `mounted()`, any caller triggers via `openDialog('name', payload)`. Unregister in `beforeUnmount()`.

**Weight units** — always mg in store. Display: `MgToWeight(item.weight, library.itemUnit)`. Input: `WeightToMg(displayValue, library.itemUnit)` before commit.

**Server-side field protection** — `saveLibrary` restores `entitlements`, `creatorFields`, `insights` from server before writing. Never trust client for plan data.

**Public list projections** — Community Discover reads from `public_lists` instead of scanning every user library. Writes still happen through the user `Library`; after saves/profile/tier/moderation changes, `syncUserPublicLists(user)` refreshes the denormalized projection.

**Public stats** — list views/copies/gear clicks/promo clicks live in `public_list_stats`; unique viewers are tracked in `public_list_viewers`. Legacy `library.insights` is no longer a runtime fallback.

**Mongo array indexes** — avoid compound indexes across multiple array fields. `seasons` and `listTypes` use separate indexes because MongoDB cannot index parallel arrays in one compound index.

**syncToken** — optimistic concurrency. Server rejects save if token mismatch (concurrent edit). Client shows conflict UI.

**`forkedFrom`** — list field tracking Open Lists lineage. Set on `importPublicList` mutation. Persisted server-side on saveLibrary (no whitelist risk — list objects stored as-is).

**Visibility gate** — unverified-email users cannot escalate to `discoverable`/`indexable` (enforced in `saveLibrary`).

**Entitlements** — `hasFeature(library.entitlements, FEATURES.X)` everywhere. Server is authoritative; client reads from `store.state.library.entitlements`.

---

## Tests

```
test/
├── unit-*.js           Node.js unit tests (run directly, no framework)
└── e2e/
    ├── save-load.spec.ts     ★ critical — core data flow
    ├── auth.spec.ts
    ├── list.spec.ts
    ├── csv.spec.ts
    └── ...
```

Run: `npm run test:e2e` · critical only: `npm run test:e2e:critical`

Migration/backfill: `npm run backfill:public-lists`

---

## Most-Touched Files (dev session frequency)

1. `client/store/mutations-library.js` — any gear data change
2. `client/models/library.js` — model changes, migration upgrades
3. `client/components/item.vue` — item row UI
4. `client/components/category.vue` — category + add-item
5. `client/components/list.vue` — list body layout
6. `client/components/sidebar.vue` — settings panel
7. `client/store/store.js` — save plugin, init action
8. `client/utils/weight.js` — weight unit logic
9. `server/library-endpoints.js` — save/load API
10. `server/auth.js` + `server/auth-endpoints.js` — auth changes
11. `client/services/entitlements.js` — feature gating
12. `client/css/_globals.scss` — design tokens
13. `client/locales/*.json` — i18n strings
