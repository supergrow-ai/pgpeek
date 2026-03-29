import { beforeEach } from "vitest";
import Database from "better-sqlite3";

// Use a fresh in-memory database for each test
beforeEach(() => {
  const globalDb = globalThis as unknown as {
    __sqliteDb?: ReturnType<typeof Database>;
  };

  // Close previous if exists
  if (globalDb.__sqliteDb) {
    try { globalDb.__sqliteDb.close(); } catch { /* */ }
  }

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE saved_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      query TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      selected_schema TEXT DEFAULT 'public',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE workspace (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  globalDb.__sqliteDb = db;
});
