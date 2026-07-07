/**
 * A minimal external store: the engines keep their reactive snapshot here and
 * any UI layer can read + subscribe. React consumes it with
 * `useSyncExternalStore`; vanilla consumers call `subscribe` directly.
 */
export interface Store<T> {
  /** The current snapshot. Stable reference until the next `set`. */
  get: () => T;
  /** Replace the snapshot and notify subscribers. */
  set: (next: T) => void;
  /** Listen for snapshot changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      value = next;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
