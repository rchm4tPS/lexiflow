import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log("Running migration: ADD COLUMN has_imported_from_lingq to user_languages...");
  try {
    // SQLite: Add column to user_languages
    await db.run(sql`ALTER TABLE user_languages ADD COLUMN has_imported_from_lingq INTEGER DEFAULT 0`);
    console.log("✅ Success adding to user_languages!");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("duplicate column name")) {
      console.log("⚠️ Column already exists in user_languages, skipping.");
    } else {
      console.error("❌ Error adding to user_languages:", err);
    }
  }

  // Attempt to drop from users (SQLite 3.35+ only)
  try {
    console.log("Attempting to DROP COLUMN has_imported_from_lingq from users (requires SQLite 3.35+)...");
    await db.run(sql`ALTER TABLE users DROP COLUMN has_imported_from_lingq`);
    console.log("✅ Success dropping from users!");
  } catch (err: unknown) {
     console.log("ℹ️ Could not drop from users (likely old SQLite version). This is safe, the column will just be ignored.", err);
  }
}

migrate();
