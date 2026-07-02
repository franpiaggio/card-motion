// Index for the "Working examples" section: real games built with card-motion.
export default function Examples() {
  return (
    <div className="ex">
      <header className="ex-head">
        <a className="ex-back" href="#">
          ← card-motion
        </a>
        <h1 className="ex-title">
          Working <span>examples</span>
        </h1>
        <p className="ex-sub">Complete games built with the library. Each is a real, playable example — drag to move, double-tap to send a card home.</p>
      </header>

      <div className="ex-grid">
        <a className="ex-card" href="#/freecell">
          <span className="ex-tag ex-tag-coral">Drag &amp; drop</span>
          <h2>FreeCell</h2>
          <p>All 52 cards face-up, four free cells, eight columns. Deterministic and pure logic.</p>
          <span className="ex-uses">DragDropProvider · DropZone · DraggableCard · Card</span>
          <span className="ex-play">Play →</span>
        </a>

        <a className="ex-card" href="#/klondike">
          <span className="ex-tag ex-tag-blue">Drag &amp; drop + stock</span>
          <h2>Klondike</h2>
          <p>The classic Solitaire: a stock and waste, face-down tableau, King-only empty columns.</p>
          <span className="ex-uses">DragDropProvider · DropZone · DraggableCard · Card</span>
          <span className="ex-play">Play →</span>
        </a>
      </div>
    </div>
  );
}
