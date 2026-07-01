import 'card-motion/styles.css';
import { useSyncExternalStore } from 'react';
import Landing from './Landing';
import Demos from './Demos';

// Tiny hash router: `#/demo` (optionally `#/demo/<name>`) opens the demos on
// their own full-screen page; everything else is the landing.
function useHash() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb);
      return () => window.removeEventListener('hashchange', cb);
    },
    () => window.location.hash,
    () => '',
  );
}

export default function App() {
  const hash = useHash();
  if (hash.startsWith('#/demo')) {
    return <Demos initial={hash.split('/')[2]} />;
  }
  return <Landing />;
}
