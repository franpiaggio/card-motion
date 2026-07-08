// The drag & drop zones demo, rebuilt with `card-motion/vanilla` only.
// No React in this file: the controller owns the mechanics (hit-testing,
// highlight, snap-back, post-drop FLIP); this demo owns the "state" — which
// here is simply where each card's DOM node lives.
import gsap from 'gsap';
import {
  attachDraggable,
  buildDeck,
  createCard,
  createDragDropController,
  mountDropZone,
  shuffleInPlace,
  type DraggableHandle,
} from 'card-motion/vanilla';

const PLAY_ZONES = ['zone-1', 'zone-2', 'zone-3'] as const;

export function mountVanillaDnd(host: HTMLElement): () => void {
  const root = document.createElement('div');
  root.className = 'dnd';
  host.append(root);

  // ── Header ──────────────────────────────────────────────────────────────
  const head = document.createElement('header');
  head.className = 'dnd-head';
  const h1 = document.createElement('h1');
  h1.textContent = 'Drag & drop zones — vanilla';
  const p = document.createElement('p');
  p.textContent =
    'Drag the hand cards into any zone (and back). Same mechanics as the React demo, driven by createDragDropController + attachDraggable.';
  const dealBtn = document.createElement('button');
  dealBtn.type = 'button';
  dealBtn.textContent = 'Deal again';
  head.append(h1, p, dealBtn);
  root.append(head);

  // ── Controller + zones ──────────────────────────────────────────────────
  // On an accepted drop we move the card's node into the target zone
  // synchronously; the controller FLIP-animates everything into place.
  const draggables = new Map<number, { handle: DraggableHandle; el: HTMLElement; destroyCard: () => void }>();
  const ctrl = createDragDropController({
    onDrop: (cardId, toZone, fromZone) => {
      if (!fromZone) return false;
      const entry = draggables.get(cardId);
      const target = bodies.get(toZone);
      if (!entry || !target) return false;
      target.append(entry.el);
      entry.handle.update({ id: cardId, zone: toZone });
      syncEmpties();
      return true;
    },
  });
  ctrl.setFlipRoot(root);

  const zonesWrap = document.createElement('div');
  zonesWrap.className = 'dnd-zones';
  root.append(zonesWrap);

  const bodies = new Map<string, HTMLElement>();
  const zones = PLAY_ZONES.map((id, i) => {
    const zone = mountDropZone(zonesWrap, ctrl, { id, label: `Zone ${i + 1}`, className: 'dnd-zone' });
    bodies.set(id, zone.body);
    return zone;
  });
  const handZone = mountDropZone(root, ctrl, { id: 'hand', ariaLabel: 'Your hand', className: 'dnd-hand' });
  bodies.set('hand', handZone.body);

  // Keep the "Drop cards here" placeholder in each empty play zone.
  const syncEmpties = () => {
    for (const id of PLAY_ZONES) {
      const body = bodies.get(id)!;
      const empty = body.querySelector('.dnd-empty');
      const hasCards = body.querySelector('.cm-draggable') != null;
      if (hasCards && empty) empty.remove();
      if (!hasCards && !empty) {
        const span = document.createElement('span');
        span.className = 'dnd-empty';
        span.textContent = 'Drop cards here';
        body.append(span);
      }
    }
  };

  // ── Dealing ─────────────────────────────────────────────────────────────
  const clearCards = () => {
    for (const { handle, destroyCard, el } of draggables.values()) {
      handle.detach();
      destroyCard();
      el.remove();
    }
    draggables.clear();
  };

  const deal = () => {
    clearCards();
    const hand = shuffleInPlace(buildDeck()).slice(0, 7);
    const foilId = hand[0].id; // one "special" foil card in the hand
    for (const c of hand) {
      const wrapper = document.createElement('div');
      const card = createCard({ rank: c.rank, suit: c.suit, color: c.color, width: 88, foil: c.id === foilId });
      wrapper.append(card.el);
      handZone.body.append(wrapper);
      const handle = attachDraggable(wrapper, ctrl, { id: c.id, zone: 'hand' });
      draggables.set(c.id, { handle, el: wrapper, destroyCard: card.destroy });
    }
    syncEmpties();
    // Animate the freshly-dealt hand in from below, staggered — like a deal.
    gsap.fromTo(
      handZone.body.querySelectorAll('.cm-draggable'),
      { y: 90, opacity: 0, scale: 0.7 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', stagger: 0.05, overwrite: 'auto', clearProps: 'transform,opacity' },
    );
  };
  dealBtn.addEventListener('click', deal);
  deal();

  return () => {
    clearCards();
    zones.forEach((z) => z.destroy());
    handZone.destroy();
    root.remove();
  };
}
