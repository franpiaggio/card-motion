import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { useCardTilt } from './useCardTilt';

function Probe() {
  const { containerRef, contentRef, onPointerMove, onPointerLeave } = useCardTilt({ duration: 0, maxTilt: 20 });
  return (
    <div ref={containerRef} data-testid="outer" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div ref={contentRef} data-testid="inner" />
    </div>
  );
}

describe('useCardTilt', () => {
  it('measures the container to compute the tilt on pointer move', () => {
    const { getByTestId } = render(<Probe />);
    const outer = getByTestId('outer');
    outer.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    const spy = vi.spyOn(outer, 'getBoundingClientRect');
    fireEvent.pointerMove(outer, { clientX: 90, clientY: 10 });
    expect(spy).toHaveBeenCalled(); // it read the rect → it ran the tilt maths
  });

  it('does not throw on pointer leave (resets the tilt)', () => {
    const { getByTestId } = render(<Probe />);
    expect(() => fireEvent.pointerLeave(getByTestId('outer'))).not.toThrow();
  });
});
