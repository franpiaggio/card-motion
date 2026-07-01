import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { DragDropProvider, useDragDrop } from './DragDropProvider';
import { DropZone } from './DropZone';
import { DraggableCard } from './DraggableCard';

const rect = (left: number, top: number, right: number, bottom: number): DOMRect =>
  ({ left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON() {} }) as DOMRect;

beforeAll(() => {
  // jsdom doesn't implement pointer capture.
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
});

// Give zone "b" a rect at x 100..200 so a drop at (150,50) hits it.
function placeZoneB(container: HTMLElement) {
  const b = container.querySelector<HTMLElement>('[data-zone-id="b"]')!;
  b.getBoundingClientRect = () => rect(100, 0, 200, 100);
}

function dragCardToB(container: HTMLElement) {
  const card = container.querySelector<HTMLElement>('.cm-draggable')!;
  fireEvent.pointerDown(card, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
  fireEvent.pointerMove(card, { clientX: 150, clientY: 50, pointerId: 1 }); // past threshold, over "b"
  fireEvent.pointerUp(card, { clientX: 150, clientY: 50, pointerId: 1 });
}

describe('DragDrop system', () => {
  it('drops a card on an accepting zone and reports (id, toZone, fromZone)', () => {
    const onDrop = vi.fn();
    const { container } = render(
      <DragDropProvider onDrop={onDrop}>
        <DropZone id="a">
          <DraggableCard id={1} zone="a"><div>card</div></DraggableCard>
        </DropZone>
        <DropZone id="b" />
      </DragDropProvider>,
    );
    placeZoneB(container);
    dragCardToB(container);
    expect(onDrop).toHaveBeenCalledWith(1, 'b', 'a');
  });

  it('rejects a drop the zone refuses, and reports the drag ended unaccepted', () => {
    const onDrop = vi.fn();
    const onDragEnd = vi.fn();
    const { container } = render(
      <DragDropProvider onDrop={onDrop} onDragEnd={onDragEnd}>
        <DropZone id="a">
          <DraggableCard id={1} zone="a"><div>card</div></DraggableCard>
        </DropZone>
        <DropZone id="b" accepts={() => false} />
      </DragDropProvider>,
    );
    placeZoneB(container);
    dragCardToB(container);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onDragEnd).toHaveBeenCalledWith(false);
  });

  it('does not drag when the provider is disabled', () => {
    const onDrop = vi.fn();
    const { container } = render(
      <DragDropProvider disabled onDrop={onDrop}>
        <DropZone id="a">
          <DraggableCard id={1} zone="a"><div>card</div></DraggableCard>
        </DropZone>
        <DropZone id="b" />
      </DragDropProvider>,
    );
    placeZoneB(container);
    dragCardToB(container);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('useDragDrop reflects the live drag state', () => {
    let state: ReturnType<typeof useDragDrop> = { dragging: false, draggingId: null, overZoneId: null, overValid: false };
    function Probe() {
      state = useDragDrop();
      return null;
    }
    const { container } = render(
      <DragDropProvider>
        <Probe />
        <DropZone id="a">
          <DraggableCard id={2} zone="a"><div>card</div></DraggableCard>
        </DropZone>
      </DragDropProvider>,
    );
    expect(state.dragging).toBe(false);
    const card = container.querySelector<HTMLElement>('.cm-draggable')!;
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
    fireEvent.pointerMove(card, { clientX: 80, clientY: 80, pointerId: 1 }); // past threshold → dragging
    expect(state.dragging).toBe(true);
    expect(state.draggingId).toBe(2);
    fireEvent.pointerUp(card, { clientX: 80, clientY: 80, pointerId: 1 });
    expect(state.dragging).toBe(false);
  });
});
