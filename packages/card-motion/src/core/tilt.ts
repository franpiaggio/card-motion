import { gsap } from './gsap';

export interface CardTiltOptions {
  /** Maximum tilt in degrees at the card's edges. Default `16`. */
  maxTilt?: number;
  /** Easing duration for the tilt, in seconds. Default `0.4`. */
  duration?: number;
}

export interface CardTiltController {
  /** Feed it the pointer position (client coords); it tilts the content. */
  pointerMove: (clientX: number, clientY: number) => void;
  /** Ease the tilt back to flat. */
  pointerLeave: () => void;
  /** Refresh `maxTilt` live. (`duration` is baked into the tween — recreate to change it.) */
  updateOptions: (next: Pick<CardTiltOptions, 'maxTilt'>) => void;
  /** Kill the tilt tweens. */
  destroy: () => void;
}

/**
 * The pointer-following 3D tilt, framework-free: you own the event wiring.
 * `container` is measured (it should own `perspective`); `content` rotates
 * (it should own `transform-style: preserve-3d`). Pair with
 * {@link attachCardTilt} to also wire the pointer listeners.
 */
export function createCardTilt(
  container: HTMLElement,
  content: HTMLElement,
  { maxTilt = 16, duration = 0.4 }: CardTiltOptions = {},
): CardTiltController {
  let max = maxTilt;
  const tiltX = gsap.quickTo(content, 'rotationX', { duration, ease: 'power2.out' });
  const tiltY = gsap.quickTo(content, 'rotationY', { duration, ease: 'power2.out' });

  return {
    pointerMove(clientX, clientY) {
      const r = container.getBoundingClientRect();
      const px = (clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
      const py = (clientY - r.top) / r.height - 0.5;
      tiltY(px * max);
      tiltX(-py * max);
    },
    pointerLeave() {
      tiltX(0);
      tiltY(0);
    },
    updateOptions(next) {
      max = next.maxTilt ?? max;
    },
    destroy() {
      gsap.killTweensOf(content);
    },
  };
}

/**
 * Convenience for vanilla use: creates the tilt controller AND wires the
 * pointer listeners on `container`. Returns a detach function.
 */
export function attachCardTilt(container: HTMLElement, content: HTMLElement, opts?: CardTiltOptions): () => void {
  const ctrl = createCardTilt(container, content, opts);
  const move = (e: PointerEvent) => ctrl.pointerMove(e.clientX, e.clientY);
  const leave = () => ctrl.pointerLeave();
  container.addEventListener('pointermove', move);
  container.addEventListener('pointerleave', leave);
  return () => {
    container.removeEventListener('pointermove', move);
    container.removeEventListener('pointerleave', leave);
    ctrl.destroy();
  };
}
