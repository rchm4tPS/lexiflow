import { migrate } from 'drizzle-orm/better-sqlite3/migrator'; // or libsql if using Turso
import { db, sqlite } from './index.js'; // your db instance

async function runMigrations() {
  console.log('⏳ Running migrations...');
  try {
    // This looks inside the drizzle/migrations folder and applies any pending SQL files
    migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    sqlite.close()
  }
}

runMigrations();