'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { attachBackgroundShader, type BackgroundShaderColors, type BackgroundShaderControls } from '../dom/background-shader';

export type { BackgroundShaderColors } from '../dom/background-shader';

export interface BackgroundShaderProps {
  /** Animation speed multiplier. Default `1`. */
  speed?: number;
  /** Max device-pixel-ratio used when sizing the canvas. Default `1.5`. */
  maxDpr?: number;
  /** Swirl colors. Any omitted color falls back to the default. */
  colors?: BackgroundShaderColors;
  className?: string;
  style?: CSSProperties;
}

/**
 * A fullscreen, GPU-rendered swirling background (WebGL fragment shader).
 * Entirely optional — render it only if you want the animated backdrop.
 * Give it a positioned parent or let it be `fixed`.
 *
 * This is the React binding of the framework-free `mountBackgroundShader`
 * (available from `card-motion/vanilla`).
 */
export function BackgroundShader({ speed = 1, maxDpr = 1.5, colors, className, style }: BackgroundShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controls = useRef<BackgroundShaderControls | null>(null);

  // Speed and colors apply live, without restarting the GL loop.
  controls.current?.setSpeed(speed);
  const lastColors = useRef(colors);
  if (colors !== lastColors.current) {
    lastColors.current = colors;
    controls.current?.setColors(colors ?? {});
  }

  const initialRef = useRef({ speed, colors });
  initialRef.current = { speed, colors };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = attachBackgroundShader(canvas, { ...initialRef.current, maxDpr });
    controls.current = c;
    return () => {
      c.destroy();
      controls.current = null;
    };
  }, [maxDpr]);

  return <canvas ref={canvasRef} className={`cm-bg-shader${className ? ` ${className}` : ''}`} style={style} />;
}
