# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend + in-memory mock API (data from hymns-import.json, no Cloudflare needed)
npm run dev

# Full stack: Wrangler dev proxy + Vite on port 5173 (requires Cloudflare D1 setup)
npm run dev:full

# Production build
npm run build

# Lint
npm run lint
```

There are no tests in this project.

### Mock API (dev mode)

`npm run dev` sets `VITE_MOCK_API=true`, which activates a Vite dev-server middleware in `vite.config.js` that intercepts all `/api/*` requests and serves in-memory data seeded from `hymns-import.json`. Changes (add/edit/delete/select) persist for the browser session but reset on server restart. `npm run dev:full` does NOT set this flag and proxies to the real Wrangler/D1 backend instead.

### D1 Database

```bash
# Apply migrations to local dev DB
wrangler d1 migrations apply hymns --local

# Apply migrations to remote (production) DB
wrangler d1 migrations apply hymns
```

## Architecture

### State & Routing

`App.jsx` holds all global state and acts as the router. There is no React Router — navigation is a `page` state variable (`'library' | 'selection'`) and within the library a `view` variable (`'list' | 'add' | 'edit' | 'detail'`). All data fetching and mutations happen in `App.jsx`; components receive data and callbacks as props.

Both `hymns` (array) and `selectionHistory` (object `{ "YYYY-MM-DD": [hymnId, ...] }`) are loaded once on mount and kept in sync with the DB through the `api` module.

### API Layer

`src/api.js` is a thin fetch wrapper — all calls go to `/api/*`. In development with `dev:full`, Wrangler proxies these to the Workers function. In production, Cloudflare Pages routes them automatically.

### Backend

`functions/api/[[route]].js` is a single Cloudflare Pages Function that handles all routes via a manual if/regex dispatch. It receives `{ request, env, params }` — the D1 database is accessed via `env.DB`.

**Key pattern:** `tags` is stored as a JSON string in D1 and parsed by `rowToHymn()` on every read. `selectionHistory` is stored as rows in `selection_history` (one row per hymn per date) and reconstructed into the `{ date: [ids] }` shape in the GET handler.

The `POST /import` endpoint is atomic in effect but not a real DB transaction — it deletes all rows then reinserts, remapping hymn IDs so history references remain valid.

### Data Model

```
hymns: { id, title, tags: string[], theme, lyrics, lastSelectedDate, createdAt }
selectionHistory: { "YYYY-MM-DD": number[] }  // ordered hymn IDs
```

Hymn `title` is intentionally read-only after creation — the PUT endpoint ignores the `title` field and the edit form disables the input.

### Styling

All styles are in `src/App.css` and `src/index.css`. CSS variables defined in `:root` (and overridden in `@media (prefers-color-scheme: dark)`) control the entire color theme. No CSS framework is used.

Tag colors are applied via a `.tag-{tagname}` CSS class pattern — adding a new tag requires both a new class in `App.css` and adding the value to the predefined tags list in `AddHymnForm.jsx`.
