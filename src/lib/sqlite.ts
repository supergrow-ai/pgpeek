import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

function getDbPath(): string {
  // Use ~/.pgpeek/ for persistent storage that survives brew upgrades
  // Fall back to cwd for development
  const homeDir = path.join(os.homedir(), ".pgpeek");
  try {
    fs.mkdirSync(homeDir, { recursive: true });
    return path.join(homeDir, "local.db");
  } catch {
    return path.join(process.cwd(), "local.db");
  }
}

const globalDb = globalThis as unknown as {
  __sqliteDb?: ReturnType<typeof Database>;
};

function initDb(): ReturnType<typeof Database> {
  const instance = new Database(getDbPath());

  instance.exec(`
    CREATE TABLE IF NOT EXISTS saved_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      query TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      selected_schema TEXT DEFAULT 'public',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS workspace (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: add selected_schema column if missing
  try {
    instance.exec(`ALTER TABLE connections ADD COLUMN selected_schema TEXT DEFAULT 'public'`);
  } catch {
    // column already exists
  }

  return instance;
}

if (!globalDb.__sqliteDb) {
  globalDb.__sqliteDb = initDb();
}

// Use a getter so tests can swap the instance via globalThis
function getDb(): ReturnType<typeof Database> {
  return globalDb.__sqliteDb!;
}

export default new Proxy({} as ReturnType<typeof Database>, {
  get(_target, prop) {
    const db = getDb();
    const value = (db as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(db);
    }
    return value;
  },
});
