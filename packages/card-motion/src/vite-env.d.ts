// Minimal typing for Vite's compile-time glob imports (used by the no-react
// guard test). vite is only a transitive dependency (via vitest), so its own
// client types are not resolvable here.
interface ImportMeta {
  glob: (
    pattern: string,
    opts?: { query?: string; import?: string; eager?: boolean },
  ) => Record<string, unknown>;
}
