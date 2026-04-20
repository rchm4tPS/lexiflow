import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const dbPath = process.env.DATABASE_URL || 'sqlite.db';

// Creates or opens the local SQLite file
// typed as `any` to avoid leaking the external BetterSqlite3.Database type
export const sqlite: ReturnType<typeof Database> = new Database(dbPath);

export const db = drizzle(sqlite);