import { migrate } from 'drizzle-orm/libsql/migrator'; // or libsql if using Turso
import { db, client } from './index.js'; // your db instance

async function runMigrations() {
  console.log('⏳ Running migrations...');
  try {
    // This looks inside the drizzle/migrations folder and applies any pending SQL files
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.close()
  }
}

runMigrations();