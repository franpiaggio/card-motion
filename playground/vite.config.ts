import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The Lastwall demo lives in examples/lastwall and is consumed from source (a
// single source of truth) via this alias, so the playground can host it as a
// route without duplicating the game.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@lastwall': fileURLToPath(new URL('../examples/lastwall/src', import.meta.url)),
    },
  },
  server: { fs: { allow: ['..'] } },
});
