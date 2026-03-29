# pgpeek

A minimal PostgreSQL GUI client built with Next.js. Browse tables, edit data inline, run SQL queries, and save them for later.

![Table Browser](public/screenshots/table-browser.png)

![Query Editor](public/screenshots/query-editor.png)

## Features

- **Connection manager** — connect via PostgreSQL URL, switch between databases, delete connections
- **Table browser** — browse tables by schema, search, paginate
- **Inline editing** — edit cells directly in the grid (AG Grid), add/delete rows
- **Query editor** — write and run raw SQL with tabular results, `Cmd+Enter` to execute
- **Saved queries** — save frequently used queries locally
- **Server-side sort & filter** — filter by column with operators (equals, like, is null, etc.) and sort, with explicit Apply button
- **JSON viewer** — click any JSON/object cell to view formatted JSON in a modal with copy support
- **Safety switches** — read-only mode and no-DDL mode enforced server-side
- **Full session persistence** — open tabs, active connection, settings, sort/filter state per tab all restore on reload
- **Tab management** — clicking an already-open table switches to its tab instead of duplicating
- **Schema selector** — switch between database schemas, persisted per connection
- **Installable PWA** — install as a desktop app from the browser, runs in its own window

## Tech Stack

- **Next.js 16** (App Router, API Routes)
- **AG Grid** (Community) for the data grid
- **SQLite** (better-sqlite3) for local state (connections, saved queries, workspace)
- **pg** (node-postgres) for PostgreSQL connections
- **Tailwind CSS** + **shadcn/ui** for the UI
- **Vitest** for testing
- **GitHub Actions** for CI

## Getting Started

### Homebrew (Mac)

```bash
brew install supergrow-ai/tap/pgpeek
pgpeek
```

### From source

Prerequisites: Node.js 20+, pnpm

```bash
git clone https://github.com/supergrow-ai/pgpeek.git
cd pgpeek
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Install as Desktop App

pgpeek is a PWA — you can install it as a standalone desktop app:

1. Open `http://localhost:3000` in Chrome
2. Click the install icon in the address bar, or go to Menu > "Install pgpeek..."
3. pgpeek will open in its own window, just like a native app

### Add a Connection

Click the `+` button next to the connection dropdown and enter a PostgreSQL URL:

```
postgresql://user:password@host:5432/database
```

### Run Tests

```bash
pnpm test
```

## Local Database

pgpeek stores connections, saved queries, and workspace state in a local SQLite file (`local.db`) in the project root. This file is gitignored and never committed.

## Safety

- **Read-only mode** (default: on) — blocks INSERT, UPDATE, DELETE, TRUNCATE via both UI and API
- **No DDL mode** (default: on) — blocks CREATE, ALTER, DROP, GRANT, REVOKE via both UI and API
- Connection credentials are stored locally and never exposed via the API
- Server-side enforcement — safety checks cannot be bypassed by calling the API directly

## Roadmap

- Data visualization (charts and graphs from query results)
- Export to CSV and Excel
- Natural language queries (AI-powered SQL generation)
