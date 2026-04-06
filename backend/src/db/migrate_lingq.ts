import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log("Running migration: ADD COLUMN has_imported_from_lingq to users...");
  try {
    await db.run(sql`ALTER TABLE users ADD COLUMN has_imported_from_lingq INTEGER DEFAULT 0`);
    console.log("✅ Success!");
  } catch (err: any) {
    if (err.message.includes("duplicate column name")) {
      console.log("⚠️ Column already exists, skipping.");
    } else {
      console.error("❌ Error during migration:", err);
    }
  }
}

migrate();
