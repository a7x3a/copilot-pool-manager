import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'fs';
import path from 'path';
import { ensureCpmDirectories, getDbPath } from '../config/config';
import * as schema from './schema';

let rawDbInstance: Database.Database | null = null;
let drizzleDbInstance: BetterSQLite3Database<typeof schema> | null = null;

export function initializeDatabase(dbPath?: string): {
  rawDb: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
} {
  const resolvedPath = dbPath || getDbPath();

  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(resolvedPath);
  sqlite.pragma('journal_mode = WAL');

  // Auto-create tables if they do not exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      github_username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      credential_reference TEXT NOT NULL,
      copilot_plan TEXT NOT NULL DEFAULT 'individual',
      status TEXT NOT NULL DEFAULT 'READY',
      last_authenticated_at INTEGER,
      last_used_at INTEGER,
      last_health_check_at INTEGER,
      last_error TEXT,
      cooldown_until INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      project_id TEXT,
      model TEXT,
      session_id TEXT,
      credits REAL,
      tokens INTEGER,
      source TEXT NOT NULL,
      raw_summary TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT,
      timestamp INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      project_id TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      path TEXT NOT NULL,
      preferred_account_id TEXT NOT NULL DEFAULT 'AUTO',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  rawDbInstance = sqlite;
  drizzleDbInstance = drizzle(sqlite, { schema });

  return {
    rawDb: rawDbInstance,
    db: drizzleDbInstance,
  };
}

export function getDb() {
  if (!drizzleDbInstance) {
    initializeDatabase();
  }
  return drizzleDbInstance!;
}

export function getRawDb(): Database.Database {
  if (!rawDbInstance) {
    initializeDatabase();
  }
  return rawDbInstance!;
}

export function closeDatabase(): void {
  if (rawDbInstance) {
    try {
      rawDbInstance.close();
    } catch {
      // ignore
    }
    rawDbInstance = null;
    drizzleDbInstance = null;
  }
}
