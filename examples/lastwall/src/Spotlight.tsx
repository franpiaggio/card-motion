// A spotlight: darkens the whole screen except a padded rectangle around the
// step's target, with a soft pulsing ring. The dimming is a giant box-shadow on
// the ring element, so the highlighted card stays fully interactive (nothing
// actually covers it). Pass `rect: null` to just dim everything (intro/outro).

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function Spotlight({ rect }: { rect: Rect | null }) {
  if (!rect) return <div className="sk-spot-full" aria-hidden="true" />;
  const pad = 10;
  return (
    <div
      className="sk-spot"
      aria-hidden="true"
      style={{
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }}
    />
  );
}
