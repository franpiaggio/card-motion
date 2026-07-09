// The win celebration shared by every solitaire example: the classic
// "cards cascade and bounce off the floor" animation, plus a confetti burst
// for the overlay. Plain TS — no React, no game knowledge.
import { gsap } from 'gsap';

export interface WinCascadeHandle {
  /** Resolves when the cascade has played out (or immediately under reduced motion). */
  finished: Promise<void>;
  /** Remove the flying clones and restore the hidden board cards. */
  cleanup: () => void;
}

/**
 * Launch every card on the board into a bouncing cascade. The animation runs
 * on fixed-position *clones* (the real, framework-managed nodes are just
 * hidden), so the game's DOM is never touched. Call `cleanup` when the
 * overlay goes away — it restores the originals for the next deal.
 */
export function runWinCascade(maxCards = 24): WinCascadeHandle {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return { finished: Promise.resolve(), cleanup: () => {} };
  }

  const all = [...document.querySelectorAll<HTMLElement>('.cm-card')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.top < innerHeight && r.bottom > 0;
  });
  // Cap the flying cards (Spider can have 100+): sample evenly across the board.
  const step = Math.max(1, Math.ceil(all.length / maxCards));
  const picked = all.filter((_, i) => i % step === 0);

  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;z-index:200;pointer-events:none;overflow:hidden';
  document.body.append(layer);

  const hidden: HTMLElement[] = [];
  const bodies = picked.map((el, i) => {
    const r = el.getBoundingClientRect();
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.cssText += `;position:fixed;left:0;top:0;margin:0;width:${r.width}px;height:${r.height}px;transform:none`;
    layer.append(clone);
    el.style.visibility = 'hidden';
    hidden.push(el);
    return {
      el: clone,
      x: r.left,
      y: r.top,
      vx: (Math.random() * 340 + 300) * (i % 2 ? 1 : -1),
      vy: -(Math.random() * 420 + 480),
      vr: (Math.random() - 0.5) * 640,
      r: 0,
      delay: i * 0.05,
    };
  });

  let alive = true;
  const finished = new Promise<void>((resolve) => {
    if (!bodies.length) return resolve();
    const duration = 2.1;
    const floor = innerHeight - 40;
    const g = 2400;
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      if (!alive) return resolve();
      let dt = (now - last) / 1000;
      last = now;
      const elapsed = (now - start) / 1000;
      // Fixed substeps: bounces stay accurate even at a throttled framerate.
      while (dt > 0) {
        const h = Math.min(1 / 120, dt);
        dt -= h;
        for (const b of bodies) {
          if (elapsed < b.delay) continue;
          b.vy += g * h;
          b.x += b.vx * h;
          b.y += b.vy * h;
          b.r += b.vr * h;
          if (b.y > floor) {
            b.y = floor;
            b.vy *= -0.72; // bounce with damping — the classic cascade feel
          }
        }
      }
      for (const b of bodies) {
        b.el.style.left = `${b.x}px`;
        b.el.style.top = `${b.y}px`;
        b.el.style.transform = `rotate(${b.r}deg)`;
      }
      if (elapsed < duration) requestAnimationFrame(tick);
      else {
        // Clean exit: everything tumbles off the bottom of the screen.
        bodies.forEach((b, i) => {
          gsap.to(b.el, { top: innerHeight + 240, duration: 0.5, ease: 'power2.in', delay: i * 0.02 });
        });
        gsap.delayedCall(0.6, resolve);
      }
    };
    requestAnimationFrame(tick);
  });

  return {
    finished,
    cleanup: () => {
      alive = false;
      layer.remove();
      for (const el of hidden) el.style.visibility = '';
    },
  };
}

/**
 * "Barrido + brillo": when a King→Ace run is completed and leaves a column,
 * its cards flash gold, then swoosh up and fade away in sequence. Runs on
 * fixed-position clones so React can drop the originals underneath without a
 * fight. Fire-and-forget — never blocks game state — and self-cleans.
 */
export function runRunComplete(cardEls: HTMLElement[]): void {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const els = cardEls.filter((el) => el.getBoundingClientRect().width > 0);
  if (!els.length) return;

  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;z-index:150;pointer-events:none;overflow:hidden';
  document.body.append(layer);

  const clones = els.map((el) => {
    const r = el.getBoundingClientRect();
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;margin:0;width:${r.width}px;height:${r.height}px;transform:none;will-change:transform,opacity,filter`;
    layer.append(clone);
    return clone;
  });

  // Match the filter structure at both ends so GSAP interpolates it smoothly.
  // `clones` are top-to-bottom (King…Ace); stagger from the end sweeps the run
  // away bottom-to-top, so the Ace leaves first and the King last.
  gsap.set(clones, { filter: 'drop-shadow(0 0 0px rgba(255,200,80,0)) brightness(1)' });
  const tl = gsap.timeline({ onComplete: () => layer.remove() });
  tl.to(clones, {
    filter: 'drop-shadow(0 0 16px rgba(255,200,80,0.95)) brightness(1.3)',
    scale: 1.08,
    duration: 0.15,
    ease: 'power2.out',
    stagger: { each: 0.022, from: 'end' },
  });
  tl.to(
    clones,
    {
      y: -90,
      scale: 0.5,
      autoAlpha: 0,
      filter: 'drop-shadow(0 0 4px rgba(255,200,80,0)) brightness(1)',
      duration: 0.45,
      ease: 'power2.in',
      stagger: { each: 0.025, from: 'end' },
    },
    '-=0.03',
  );
}

/** A short confetti burst over the whole screen (skipped under reduced motion). */
export function burstConfetti(n = 60): void {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ffd76a', '#f0a92d', '#d1304a', '#246bd9', '#eef0fb'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    const s = 6 + Math.random() * 8;
    p.style.cssText = `position:fixed;z-index:210;top:-20px;left:${Math.random() * 100}vw;width:${s}px;height:${s * 0.55}px;background:${colors[i % colors.length]};border-radius:2px;pointer-events:none`;
    document.body.append(p);
    gsap.to(p, {
      y: innerHeight + 60,
      x: `+=${(Math.random() - 0.5) * 240}`,
      rotation: Math.random() * 720 - 360,
      duration: 2.2 + Math.random() * 1.6,
      delay: Math.random() * 0.5,
      ease: 'power1.in',
      onComplete: () => p.remove(),
    });
  }
}
