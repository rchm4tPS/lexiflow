import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Creates or opens the local SQLite file
// typed as `any` to avoid leaking the external BetterSqlite3.Database type
export const sqlite: ReturnType<typeof Database> = new Database('sqlite.db');

export const db = drizzle(sqlite);