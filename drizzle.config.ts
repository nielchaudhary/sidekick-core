import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/config/database/schema',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL! + '?sslmode=require',
  },
});
