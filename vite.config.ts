import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/** Base Vite : `VITE_BASE` (ex. `/` en production Pages) ou `./` en local si non défini. */
function resolveViteBase(): string {
  const raw = process.env.VITE_BASE?.trim();
  if (!raw) return './';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig({
  plugins: [vue()],
  /** Défini par `VITE_BASE` (CI / `npm run build:pages`). */
  base: resolveViteBase(),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
