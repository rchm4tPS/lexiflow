import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL || 'file:sqlite.db';

export const client = createClient({
  url,
  ...(!url.startsWith('file:') && process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN as string } : {})
});

export const db = drizzle(client);