# pgpeek

A minimal, local PostgreSQL GUI client. Browse tables, edit data inline, run SQL queries, and save them — all in a tabbed interface with full session persistence.

![Table Browser](./public/screenshots/table-browser.png)

![Query Editor](./public/screenshots/query-editor.png)

## Features

- **Connection manager** — connect via PostgreSQL URL, switch between databases, auto-connect on create
- **Table browser** — browse tables by schema, search, paginate
- **Inline editing** — edit cells directly in the grid, add/delete rows
- **Query editor** — write and run raw SQL, `Cmd+Enter` to execute
- **Saved queries** — save and recall frequently used queries
- **Server-side sort & filter** — filter by column (equals, like, is null, etc.) with explicit Apply
- **JSON viewer** — click any JSON cell to view formatted JSON with copy support
- **Safety switches** — read-only and no-DDL modes enforced server-side
- **Session persistence** — tabs, sort/filter, settings all persist per connection across reloads
- **Tab management** — no duplicate tabs, state preserved on switch
- **Schema selector** — switch schemas, persisted per connection
- **Installable PWA** — install as a desktop app from the browser

## Install

### Homebrew (Mac)

```bash
brew install supergrow-ai/tap/pgpeek
pgpeek
```

### From source

```bash
git clone https://github.com/supergrow-ai/pgpeek.git
cd pgpeek
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires Node.js 20+ and pnpm.

### Install as Desktop App

1. Open `http://localhost:3000` in Chrome
2. Click the install icon in the address bar, or Menu > "Install pgpeek..."

## Usage

Click `+` next to the connection dropdown and enter a PostgreSQL URL:

```
postgresql://user:password@host:5432/database
```

The connection auto-connects and tables appear in the sidebar. Click any table to browse, or open a query editor.

## Data Storage

All data is stored locally at `~/.pgpeek/local.db` (SQLite). This includes saved connections, queries, and workspace state. Nothing is sent externally. The database file survives app upgrades.

## Safety

- **Read-only mode** (default: on) — blocks INSERT, UPDATE, DELETE, TRUNCATE
- **No DDL mode** (default: on) — blocks CREATE, ALTER, DROP, GRANT, REVOKE
- Enforced server-side — cannot be bypassed by calling the API directly
- Connection credentials are stored locally and never exposed via the API

## Tests

```bash
pnpm test
```

42 tests covering connections, saved queries, workspace persistence, and security enforcement. CI runs on every push via GitHub Actions.

## Tech Stack

Next.js 16 · AG Grid · SQLite (better-sqlite3) · node-postgres · Tailwind CSS · shadcn/ui · Vitest

## Roadmap

- Data visualization (charts from query results)
- Export to CSV and Excel
- Natural language queries (AI-powered SQL generation)

## License

MIT
