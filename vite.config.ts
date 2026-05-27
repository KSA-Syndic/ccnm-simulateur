import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/** Base absolue avec slash final pour GitHub Pages (sous-dossier /v2/). Évite les 404 si l’URL n’a pas de slash final. */
function resolveViteBase(): string {
  const raw = process.env.VITE_BASE?.trim();
  if (!raw) return './';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig({
  plugins: [vue()],
  /** CI Pages Vue : `VITE_BASE=/v2/` (custom domain). Local : `./` par défaut. */
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
