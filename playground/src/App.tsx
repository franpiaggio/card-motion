import 'card-motion/styles.css';
import { useSyncExternalStore } from 'react';
import Landing from './Landing';
import Demos, { isDemo } from './Demos';
import Docs from './Docs';
import Examples from './examples/Examples';
import FreeCell from './examples/FreeCell';
import Klondike from './examples/Klondike';
import Golf from './examples/Golf';
import Spider from './examples/Spider';
import Pyramid from './examples/Pyramid';

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
  if (hash === '#/examples') return <Examples />;
  if (hash === '#/freecell') return <FreeCell />;
  if (hash === '#/klondike') return <Klondike />;
  if (hash === '#/golf') return <Golf />;
  if (hash === '#/spider') return <Spider />;
  if (hash === '#/pyramid') return <Pyramid />;
  if (hash === '#/docs' || hash.startsWith('#/docs/')) {
    return <Docs />;
  }
  if (hash === '#/demo' || hash.startsWith('#/demo/')) {
    // The active demo is derived from the hash, so browser Back/Forward works.
    const parsed = hash.split('/')[2];
    const demo = isDemo(parsed) ? parsed : 'game';
    return <Demos demo={demo} onPick={(d) => (window.location.hash = `#/demo/${d}`)} />;
  }
  return <Landing />;
}
