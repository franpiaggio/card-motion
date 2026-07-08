import { describe, expect, it } from 'vitest';

// The core and dom layers are the framework-agnostic build: importing react
// (or @gsap/react, whose entry imports react) from them breaks the vanilla
// entry point. This test is the guard.
const BANNED = /from\s+['"](react|react-dom|react\/[^'"]*|react-dom\/[^'"]*|@gsap\/react)['"]/;

// Vite/Vitest resolves these globs at transform time; `query: '?raw'` hands us
// the file contents as strings without executing them.
const files: Record<string, string> = {
  ...import.meta.glob('../core/**/*.ts', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../dom/**/*.ts', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../lib/**/*.ts', { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>;

describe('core/dom stay react-free', () => {
  it('no file under src/core, src/dom or src/lib imports react or @gsap/react', () => {
    const offenders = Object.entries(files)
      .filter(([path]) => !path.includes('.test.'))
      .filter(([, source]) => BANNED.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
    expect(Object.keys(files).length).toBeGreaterThan(0); // globs actually matched
  });
});
