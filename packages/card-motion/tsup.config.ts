import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const CLIENT_FILES = ['dist/index.js', 'dist/index.cjs'];

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  minify: false,
  // react / react-dom / gsap / @gsap/react stay external (peer + deps)
  external: ['react', 'react-dom', 'gsap', '@gsap/react'],
  // Prepend the 'use client' directive AFTER bundling. A banner gets tree-shaken
  // away (esbuild drops the bare string literal), so we inject it here instead.
  async onSuccess() {
    for (const file of CLIENT_FILES) {
      const code = readFileSync(file, 'utf8');
      if (!/^['"]use client['"]/.test(code)) {
        writeFileSync(file, `'use client';\n${code}`);
      }
    }
  },
});
