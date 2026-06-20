# 诗歌曲库 (Select Hymns App)

A full-stack worship hymn management application for Chinese-speaking church worship teams. Built with React + Vite on the frontend and Cloudflare Workers + D1 on the backend.

## Features

- **曲库管理** — Add, edit, delete, and browse hymns with title, tags, theme, and lyrics
- **搜索与筛选** — Search by title/theme, filter by predefined tags (安静, 赞美, 恩典, 饼杯, 回应)
- **选歌工作台** — Pick hymns for a specific date with drag-and-drop reordering
- **历史记录** — View past selections by date
- **导入 / 导出** — Backup and restore the entire hymn library and selection history as JSON
- **深色模式** — Automatic light/dark theme based on system preference

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8 |
| Backend | Cloudflare Workers (Pages Functions) |
| Database | Cloudflare D1 (SQLite-compatible) |
| Styling | Plain CSS with CSS variables |
| Deploy | Cloudflare Pages |

## Project Structure

```
select-hymns-app/
├── src/
│   ├── App.jsx                  # Root component, global state, routing
│   ├── api.js                   # API client (fetch wrapper)
│   └── components/
│       ├── HymnList.jsx         # Paginated hymn library
│       ├── HymnCard.jsx         # Hymn card with actions
│       ├── HymnDetail.jsx       # Full hymn detail page
│       ├── AddHymnForm.jsx      # Create / edit hymn form
│       ├── HymnSearchBar.jsx    # Search input + tag filters
│       ├── SelectionPage.jsx    # Selection page (workbench + history tabs)
│       ├── SelectionWorkbench.jsx # Date picker + drag-drop selection
│       ├── HistoryView.jsx      # Past selections view
│       └── Pagination.jsx       # Page navigation
├── functions/
│   └── api/[[route]].js         # Cloudflare Workers API handler
├── migrations/
│   └── 0001_schema.sql          # D1 database schema
├── hymns-import.json            # Sample hymn data
├── wrangler.toml                # Cloudflare configuration
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Cloudflare account with Workers and D1 enabled
- Wrangler CLI: `npm install -g wrangler`

### Local Development

```bash
# Install dependencies
npm install

# Frontend only (no backend)
npm run dev

# Full stack (Vite + Wrangler dev server)
npm run dev:full
```

The frontend runs on `http://localhost:5173`. With `dev:full`, the Workers API is also available locally.

### Database Setup

```bash
# Create the D1 database
wrangler d1 create select-hymns-db

# Apply migrations
wrangler d1 migrations apply select-hymns-db
```

Update the `database_id` in `wrangler.toml` with the ID returned by the create command.

### Deploy

```bash
# Build and deploy to Cloudflare Pages
npm run build
npx wrangler pages deploy ./dist --project-name select-hymns-app
```

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/hymns` | GET | Fetch all hymns |
| `/api/hymns` | POST | Create a hymn |
| `/api/hymns/:id` | PUT | Update a hymn |
| `/api/hymns/:id` | DELETE | Delete a hymn |
| `/api/history` | GET | Fetch all selection history |
| `/api/history/:date` | PUT | Save selections for a date (YYYY-MM-DD) |
| `/api/import` | POST | Atomically replace all data |

## Hymn Data Model

```json
{
  "id": 1,
  "title": "主啊！我到你面前",
  "tags": ["安静"],
  "theme": "亲近神",
  "lyrics": "...",
  "lastSelectedDate": "2026-06-15",
  "createdAt": 1718000000
}
```

**Available tags:** `安静` · `赞美` · `恩典` · `饼杯` · `回应`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run dev:full` | Full stack local development |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
