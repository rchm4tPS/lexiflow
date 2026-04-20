import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
config({ path: '.env' });

const url = process.env.DATABASE_URL || 'file:sqlite.db';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso', 
  dbCredentials: {
    url: url,
    authToken: url.startsWith("file:") ? undefined : process.env.DATABASE_AUTH_TOKEN,
  },
});