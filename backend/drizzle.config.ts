import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite', // Changed from postgresql
  dbCredentials: {
    url: './sqlite.db', // This will literally create a file called sqlite.db in your folder!
  },
});