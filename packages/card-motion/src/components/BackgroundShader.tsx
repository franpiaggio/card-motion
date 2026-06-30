'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.12;
  float r = length(uv);
  float ang = atan(uv.y, uv.x) + r * 2.0 - t;       // swirl
  vec2 p = vec2(cos(ang), sin(ang)) * r * 3.0;
  float n = noise(p + t) + 0.5 * noise(p * 2.0 - t * 1.3);

  vec3 deep = vec3(0.04, 0.07, 0.18);
  vec3 red  = vec3(0.80, 0.13, 0.24);
  vec3 blue = vec3(0.14, 0.42, 0.85);

  vec3 col = mix(deep, red, smoothstep(0.25, 0.85, n));
  col = mix(col, blue, 0.45 + 0.45 * sin(t + r * 4.0));
  col *= 0.55 + 0.45 * n;
  col *= smoothstep(1.5, 0.15, r);                  // vignette

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.error('[card-motion] BackgroundShader:', gl.getShaderInfoLog(sh));
  }
  return sh;
}

export interface BackgroundShaderProps {
  /** Animation speed multiplier. Default `1`. */
  speed?: number;
  /** Max device-pixel-ratio used when sizing the canvas. Default `1.5`. */
  maxDpr?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A fullscreen, GPU-rendered swirling background (WebGL fragment shader).
 * Renders behind your content; give it a positioned parent or let it be `fixed`.
 */
export function BackgroundShader({ speed = 1, maxDpr = 1.5, className, style }: BackgroundShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_res');

    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const loop = (now: number) => {
      elapsed += ((now - last) / 1000) * speedRef.current;
      last = now;
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, [maxDpr]);

  return <canvas ref={canvasRef} className={`cm-bg-shader${className ? ` ${className}` : ''}`} style={style} />;
}
