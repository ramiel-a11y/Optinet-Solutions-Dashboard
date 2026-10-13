import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // Pinned so timezone-sensitive assertions (e.g. UTC vs local date reads)
    // discriminate on every machine, not just ones west of UTC.
    env: { TZ: 'America/New_York' },
    // Free-tier Supabase session pooler caps at 15 connections — run files
    // sequentially so integration tests don't exhaust the pool.
    fileParallelism: false,
    server: {
      deps: {
        inline: ['postgres'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
