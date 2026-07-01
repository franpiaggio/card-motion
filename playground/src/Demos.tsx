import { BackgroundShader, CardTable } from 'card-motion';
import DragDropDemo from './DragDropDemo';
import GameDemo from './GameDemo';
import Sandbox from './Sandbox';

export type Demo = 'table' | 'dnd' | 'game' | 'sandbox';
export const isDemo = (x: string | undefined): x is Demo =>
  x === 'table' || x === 'dnd' || x === 'game' || x === 'sandbox';

const TABS: ReadonlyArray<readonly [Demo, string]> = [
  ['table', 'Card table'],
  ['dnd', 'Drag & drop'],
  ['game', 'Poker'],
  ['sandbox', 'Sandbox'],
];

// The demos on their own full-screen page (reached at #/demo or #/demo/<name>).
// Controlled by App from the URL hash, so Back/Forward and shared links work.
export default function Demos({ demo, onPick }: { demo: Demo; onPick: (d: Demo) => void }) {
  return (
    <div className="app">
      <BackgroundShader />
      <a className="demo-back" href="#">
        ← card-motion
      </a>
      <nav className="demo-nav" aria-label="Demos">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={demo === key ? 'on' : ''}
            aria-current={demo === key ? 'true' : undefined}
            onClick={() => onPick(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {demo === 'table' && <CardTable handSize={8} cardWidth={96} />}
      {demo === 'dnd' && <DragDropDemo />}
      {demo === 'game' && <GameDemo />}
      {demo === 'sandbox' && <Sandbox />}
    </div>
  );
}
