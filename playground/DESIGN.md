# Playground design system

The visual identity for the `card-motion` playground. The tokens live in
`src/index.css` under `:root`; this file is the rationale behind them.

## Register

Product. These are interactive demos that serve a task (showing what the library
does), not a marketing surface. The design should disappear into the interaction
and let the **card motion** be the thing you notice.

## Identity: "Riso Arcade"

The `BackgroundShader` swirl stays visible behind the demo under a light warm
veil (the ground is ~22% ink, not opaque) — the swirl's blue/red reads as a
moving companion to the riso inks, and the veil only exists to keep free-floating
text legible over its brighter passes.

A warm-ink veil printed with two flat riso inks. It keeps the playful,
game-like energy the scoring demo needs, without the glossy skeuomorphism it
started with. The look is deliberately its own: **not** a felt-and-gold casino,
**not** a neon-on-black arcade, and specifically **not** the juicy candy style of
the game that inspired the demo (see "Naming" below).

Principles:

- **Flat, printed, blocky.** Hard edges, tight radii, no gradients-as-depth, no
  glass gloss. Buttons read like printed stickers, not moulded plastic.
- **Two inks carry the identity.** Blue and coral do the semantic work; a sparing
  marigold marks scoring. The warm ink and paper neutrals do everything else.
- **Grain, not glow.** A faint fractal-noise wash (`.game::after`) gives the
  surface its printed texture instead of drop-shadows and blur.
- **Cards are the only rich color.** The chrome stays restrained so the animated
  cards are the loudest thing on screen.

## Color

Strategy: **Committed** — the two riso inks plus the warm-ink ground own the
surface, past the "one accent ≤10%" product floor, on purpose. All neutrals are
tinted warm (hue ~55–85); no pure `#000`/`#fff`. Colors are authored in OKLCH.

| Token          | Value (OKLCH)                | Role                                   |
| -------------- | ---------------------------- | -------------------------------------- |
| `--ink-950`    | `0.15 0.014 55`              | App / demo ground                      |
| `--ink-900`    | `0.185 0.015 55`             | Nav surface                            |
| `--ink-850`    | `0.225 0.016 55`             | HUD panel                              |
| `--ink-800`    | `0.27 0.016 55`              | Chips, recessed fills, disabled        |
| `--line`       | `0.34 0.017 58`              | Hairline borders                       |
| `--paper`      | `0.95 0.012 85`              | Primary text                           |
| `--paper-dim`  | `0.74 0.02 78`               | Secondary text / math                  |
| `--paper-faint`| `0.56 0.022 72`              | Labels, pile tags, muted copy          |
| `--blue`       | `0.66 0.16 248`              | `--info`: progress, hands, chips, win  |
| `--coral`      | `0.68 0.19 34`               | `--accent`: primary action, discards   |
| `--coral-deep` | `0.5 0.16 34`                | The 2px offset under primary buttons   |
| `--marigold`   | `0.82 0.14 78`               | `--gold`: hand names, mult emphasis    |

Semantic aliases: `--accent` (coral) = primary actions; `--info` (blue) =
progress & selection state; `--gold` (marigold) = scoring emphasis. Win/lose use
blue/coral rather than green/red to stay inside the two-ink palette.

## Typography

- **Display:** `Space Grotesk` (`--font-display`) for the score, labels, hand
  names, pile tags, buttons, and nav. Its geometric grotesk character is the
  typographic half of the identity.
- **UI/body:** system stack (`--font-ui`) for prose and muted hints.
- Small labels are uppercase with wide tracking (0.1–0.14em). Numbers use
  `font-variant-numeric: tabular-nums` everywhere they change (score, counters,
  chips, mult) so they don't jitter.

## Shape & motion

- `--radius: 6px`, `--radius-lg: 10px` — tight, printed corners.
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint). UI transitions
  are 100–250ms; motion conveys state (button press, bar fill, hover), never
  decoration. Card choreography stays owned by GSAP in the component.
- Primary button press collapses its 2px offset and translates into it — a
  physical "stamp", flat throughout.

## Components

- **Primary button** (`.game-play` — deal / play / replay): coral fill, ink text,
  hard 2px `--coral-deep` offset. Hover brightens; active stamps down; disabled
  goes to inert ink.
- **Secondary button** (`.game-discard`): ghost with a `--line` hairline that
  borrows the coral ink on hover. Lower commitment than the primary, as a
  spend-a-resource action should read.
- **HUD / chips / tally**: flat `--ink-850`/`--ink-800` blocks with hairline
  borders and tight radii. Chips and mult are tinted glyphs of their ink.

## Naming

The section is labelled **"Demo"** in the UI, and the component, CSS prefix
(`.game-*`), and e2e spec were renamed off the original game's trademark. The
mechanics it demonstrates (poker-hand scoring) aren't the concern; the **name and
the derivative look** were, and both are now gone.

## Scope & next steps

The tokens are playground-wide. The nav and the Demo section consume them today;
the Card-table and Drag-&-drop demos still carry their original ad-hoc colors and
are the natural next surfaces to migrate onto these variables.
