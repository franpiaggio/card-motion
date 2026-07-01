import { useState } from 'react';
import { BackgroundShader, CardTable } from 'card-motion';
import DragDropDemo from './DragDropDemo';
import GameDemo from './GameDemo';
import Sandbox from './Sandbox';

type Demo = 'table' | 'dnd' | 'game' | 'sandbox';
const isDemo = (x: string | undefined): x is Demo =>
  x === 'table' || x === 'dnd' || x === 'game' || x === 'sandbox';

// The demos on their own full-screen page (reached at #/demo or #/demo/<name>).
// The active demo is reflected in the hash so the URL is shareable.
export default function Demos({ initial }: { initial?: string }) {
  const [demo, setDemo] = useState<Demo>(isDemo(initial) ? initial : 'game');
  const pick = (d: Demo) => {
    setDemo(d);
    window.location.hash = `#/demo/${d}`;
  };

  return (
    <div className="app">
      <BackgroundShader />
      <a className="demo-back" href="#">
        ← card-motion
      </a>
      <nav className="demo-nav" aria-label="Demos">
        <button type="button" className={demo === 'table' ? 'on' : ''} onClick={() => pick('table')}>
          Card table
        </button>
        <button type="button" className={demo === 'dnd' ? 'on' : ''} onClick={() => pick('dnd')}>
          Drag &amp; drop
        </button>
        <button type="button" className={demo === 'game' ? 'on' : ''} onClick={() => pick('game')}>
          Demo
        </button>
        <button type="button" className={demo === 'sandbox' ? 'on' : ''} onClick={() => pick('sandbox')}>
          Sandbox
        </button>
      </nav>
      {demo === 'table' && <CardTable handSize={8} cardWidth={96} />}
      {demo === 'dnd' && <DragDropDemo />}
      {demo === 'game' && <GameDemo />}
      {demo === 'sandbox' && <Sandbox />}
    </div>
  );
}
