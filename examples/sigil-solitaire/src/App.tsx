import { useState } from 'react';
import { BackgroundShader } from 'card-motion';
import Game, { type GameResult } from './Game';
import StartScreen from './StartScreen';
import EndOverlay from './EndOverlay';
import { TUTORIAL_CFG, type Difficulty } from './game/difficulties';

const SHADER_COLORS = { deep: '#140b26', warm: '#e0632b', cool: '#2f8fb0' };

export default function App() {
  const [screen, setScreen] = useState<'start' | 'playing' | 'tutorial'>('start');
  const [diff, setDiff] = useState<Difficulty | null>(null);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);

  const startWith = (d: Difficulty) => {
    setDiff(d);
    setSeed((s) => s + 1);
    setResult(null);
    setScreen('playing');
  };
  const playAgain = () => {
    setSeed((s) => s + 1);
    setResult(null);
  };
  const toMenu = () => {
    setScreen('start');
    setResult(null);
    setDiff(null);
  };

  return (
    <div className="sig-app">
      <BackgroundShader className="sig-bg" speed={0.5} colors={SHADER_COLORS} />
      {screen === 'start' && <StartScreen onPick={startWith} onTutorial={() => setScreen('tutorial')} />}
      {screen === 'tutorial' && <Game key="tutorial" cfg={TUTORIAL_CFG} tutorial onEnd={() => {}} onQuit={toMenu} />}
      {screen === 'playing' && diff && (
        <>
          <Game key={seed} cfg={diff} onEnd={setResult} onQuit={toMenu} />
          {result && <EndOverlay cfg={diff} result={result} onAgain={playAgain} onMenu={toMenu} />}
        </>
      )}
    </div>
  );
}
