import { BackgroundShader, CardTable } from 'card-motion';
import 'card-motion/styles.css';

export default function App() {
  return (
    <div className="app">
      <BackgroundShader />
      <CardTable handSize={8} cardWidth={96} />
    </div>
  );
}
