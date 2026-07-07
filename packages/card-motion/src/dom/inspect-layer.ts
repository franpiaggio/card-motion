import { gsap } from '../core/gsap';

export interface InspectLayerOptions {
  /** Called when the backdrop is clicked. (Escape is handled by the inspect engine.) */
  onClose: () => void;
  /** Extra class on the backdrop, for theming. */
  className?: string;
}

export interface InspectLayerHandle {
  /**
   * Show `content` magnified, flying out of `sourceRect` (the inspected card's
   * on-screen rect) to a centered, readable size.
   */
  open: (content: Node | string, sourceRect: DOMRect | null) => void;
  /** Animate the content back into the source rect and unmount. */
  close: () => void;
  /** Remove immediately, killing any running animation. */
  destroy: () => void;
}

/**
 * The magnify overlay for `createCardInspect`, framework-free. Renders a
 * dimmed backdrop (appended to `document.body`, so it escapes any clipping /
 * stacking context) and animates the content out of the source card's rect to
 * a centered, readable size (a FLIP), then back into it on close. Content is
 * yours; the motion is ours. Same DOM and `cm-inspect*` classes as the React
 * `CardInspectLayer`.
 */
export function createInspectLayer({ onClose, className }: InspectLayerOptions): InspectLayerHandle {
  let root: HTMLDivElement | null = null;
  let box: HTMLDivElement | null = null;
  // The box's centered (identity-transform) rect, captured on open so the close
  // animation flies back to the same spot without measuring mid-tween.
  let targetRect: DOMRect | null = null;
  let sourceRect: DOMRect | null = null;

  const fromSource = (t: DOMRect) => {
    if (!sourceRect || t.width === 0) return { x: 0, y: 0, scale: 0.9, autoAlpha: 0 };
    return {
      x: sourceRect.left + sourceRect.width / 2 - (t.left + t.width / 2),
      y: sourceRect.top + sourceRect.height / 2 - (t.top + t.height / 2),
      scale: sourceRect.width / t.width,
      autoAlpha: 1,
    };
  };

  const unmount = () => {
    if (root) {
      gsap.killTweensOf([root, box]);
      root.remove();
      root = null;
      box = null;
    }
  };

  return {
    open(content, rect) {
      sourceRect = rect;
      if (!root) {
        root = document.createElement('div');
        root.className = `cm-inspect${className ? ` ${className}` : ''}`;
        root.addEventListener('pointerdown', () => onClose());
        box = document.createElement('div');
        box.className = 'cm-inspect-box';
        box.addEventListener('pointerdown', (e) => e.stopPropagation());
        root.append(box);
        document.body.append(root);
      }
      box!.replaceChildren(typeof content === 'string' ? document.createTextNode(content) : content);

      gsap.killTweensOf([box, root]);
      targetRect = box!.getBoundingClientRect(); // identity transform right now
      const from = fromSource(targetRect);
      gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' });
      gsap.fromTo(box, from, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: 0.36, ease: 'power3.out' });
    },
    close() {
      if (!root || !box) return;
      gsap.killTweensOf([box, root]);
      const to = fromSource(targetRect ?? box.getBoundingClientRect());
      gsap.to(box, { ...to, duration: 0.24, ease: 'power3.in' });
      gsap.to(root, { autoAlpha: 0, duration: 0.22, ease: 'power2.in', onComplete: unmount });
    },
    destroy: unmount,
  };
}
