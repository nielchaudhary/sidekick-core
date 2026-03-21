import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/config/database/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL!,
  },
});
