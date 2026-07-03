import { useState } from 'react';
import { BackgroundShader } from 'card-motion';
import Game, { type GameResult } from './Game';
import StartScreen from './StartScreen';
import EndOverlay from './EndOverlay';
import { TUTORIAL_CFG, type Difficulty } from './game/difficulties';

// A cold, torchlit siege at dusk: deep indigo night, warm ember light, a cool
// steel edge. Distinct from the sigil demo's palette on purpose.
const SHADER_COLORS = { deep: '#0d1226', warm: '#d8622f', cool: '#3f7d7a' };

type Screen = 'menu' | 'playing' | 'tutorial';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [diff, setDiff] = useState<Difficulty | null>(null);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);

  const startWith = (d: Difficulty) => {
    setDiff(d);
    setSeed((s) => s + 1);
    setResult(null);
    setScreen('playing');
  };
  const startTutorial = () => {
    setSeed((s) => s + 1);
    setResult(null);
    setScreen('tutorial');
  };
  const playAgain = () => {
    setSeed((s) => s + 1);
    setResult(null);
  };
  const toMenu = () => {
    setDiff(null);
    setResult(null);
    setScreen('menu');
  };

  return (
    <div className="sk-app">
      <BackgroundShader className="sk-bg" speed={0.45} colors={SHADER_COLORS} />
      {screen === 'menu' && <StartScreen onPick={startWith} onWalkthrough={startTutorial} />}
      {screen === 'tutorial' && <Game key={`tut-${seed}`} cfg={TUTORIAL_CFG} tutorial onEnd={() => {}} onQuit={toMenu} />}
      {screen === 'playing' && diff && (
        <>
          <Game key={seed} cfg={diff} onEnd={setResult} onQuit={toMenu} />
          {result && <EndOverlay cfg={diff} result={result} onAgain={playAgain} onMenu={toMenu} />}
        </>
      )}
    </div>
  );
}
