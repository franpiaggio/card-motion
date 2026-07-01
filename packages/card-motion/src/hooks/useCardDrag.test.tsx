import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCardDrag, type DragPoint } from './useCardDrag';

// Minimal fake pointer event: gsap.set on a plain object is a no-op set of
// props (no DOM needed), and the drag maths only reads clientX/Y + rects.
function makeTarget() {
  return { getBoundingClientRect: () => ({ left: 0, top: 0, width: 80, height: 112 }), setPointerCapture: () => {} };
}
function ptr(clientX: number, clientY: number, target: ReturnType<typeof makeTarget>) {
  return { clientX, clientY, pointerId: 1, currentTarget: target } as never;
}

const stageRef = { current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) } } as never;

describe('useCardDrag', () => {
  it('reports a press with no movement as a tap (not a drop)', () => {
    const onTap = vi.fn();
    const onDrop = vi.fn();
    const resolveDrop = vi.fn<() => 'z'>(() => 'z');
    const { result } = renderHook(() => useCardDrag({ stageRef, resolveDrop, onDrop, onTap }));
    const p = result.current.dragProps(7);
    const t = makeTarget();
    p.onPointerDown(ptr(40, 56, t));
    p.onPointerUp(ptr(41, 57, t)); // < threshold → a click
    expect(onTap).toHaveBeenCalledWith(7);
    expect(resolveDrop).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('passes the dragged id to resolveDrop and drops onto the resolved pile', () => {
    const onDrop = vi.fn();
    const resolveDrop = vi.fn((_id: number, _p: DragPoint) => 'zoneA' as const);
    const { result } = renderHook(() => useCardDrag({ stageRef, resolveDrop, onDrop }));
    const p = result.current.dragProps(3);
    const t = makeTarget();
    p.onPointerDown(ptr(40, 56, t));
    p.onPointerMove(ptr(120, 120, t)); // past threshold → a drag
    p.onPointerUp(ptr(120, 120, t));
    expect(resolveDrop).toHaveBeenCalledWith(3, { x: 120, y: 120 }, { width: 200, height: 200 });
    expect(onDrop).toHaveBeenCalledWith(3, 'zoneA');
  });

  it('a rejected drop (resolveDrop → null) reports null so the caller snaps back', () => {
    const onDrop = vi.fn();
    // The rule lives here, in the caller: id 9 is rejected everywhere.
    const resolveDrop = (id: number): 'zoneA' | null => (id === 9 ? null : 'zoneA');
    const { result } = renderHook(() => useCardDrag({ stageRef, resolveDrop, onDrop }));
    const p = result.current.dragProps(9);
    const t = makeTarget();
    p.onPointerDown(ptr(40, 56, t));
    p.onPointerMove(ptr(120, 120, t));
    p.onPointerUp(ptr(120, 120, t));
    expect(onDrop).toHaveBeenCalledWith(9, null);
  });

  it('does not start a drag on a card that canDrag rejects', () => {
    const onTap = vi.fn();
    const resolveDrop = vi.fn(() => 'z' as const);
    const { result } = renderHook(() => useCardDrag({ stageRef, resolveDrop, onTap, canDrag: () => false }));
    const p = result.current.dragProps(1);
    const t = makeTarget();
    p.onPointerDown(ptr(40, 56, t));
    p.onPointerUp(ptr(120, 120, t)); // no capture started → ignored
    expect(onTap).not.toHaveBeenCalled();
    expect(resolveDrop).not.toHaveBeenCalled();
  });
});
