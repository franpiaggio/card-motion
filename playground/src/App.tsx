import { useState } from 'react';
import { BackgroundShader, CardTable } from 'card-motion';
import 'card-motion/styles.css';
import DragDropDemo from './DragDropDemo';
import GameDemo from './GameDemo';

type Demo = 'table' | 'dnd' | 'game';

export default function App() {
  const [demo, setDemo] = useState<Demo>('table');

  return (
    <div className="app">
      <BackgroundShader />
      <nav className="demo-nav">
        <button type="button" className={demo === 'table' ? 'on' : ''} onClick={() => setDemo('table')}>
          Card table
        </button>
        <button type="button" className={demo === 'dnd' ? 'on' : ''} onClick={() => setDemo('dnd')}>
          Drag &amp; drop
        </button>
        <button type="button" className={demo === 'game' ? 'on' : ''} onClick={() => setDemo('game')}>
          Demo
        </button>
      </nav>
      {demo === 'table' && <CardTable handSize={8} cardWidth={96} />}
      {demo === 'dnd' && <DragDropDemo />}
      {demo === 'game' && <GameDemo />}
    </div>
  );
}
