const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec3 u_deep;
uniform vec3 u_warm;
uniform vec3 u_cool;

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

  vec3 col = mix(u_deep, u_warm, smoothstep(0.25, 0.85, n));
  col = mix(col, u_cool, 0.45 + 0.45 * sin(t + r * 4.0));
  col *= 0.55 + 0.45 * n;
  col *= smoothstep(1.5, 0.15, r);                  // vignette

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Colors of the swirl. Defaults to the signature red/blue look. */
export interface BackgroundShaderColors {
  /** Dark base color. Default `#0a122e`. */
  deep?: string;
  /** Warm swirl color. Default `#cc213d`. */
  warm?: string;
  /** Cool accent color. Default `#246bd9`. */
  cool?: string;
}

const DEFAULT_COLORS: Required<BackgroundShaderColors> = {
  deep: '#0a122e',
  warm: '#cc213d',
  cool: '#246bd9',
};

type Vec3 = [number, number, number];

function hexToVec3(hex: string): Vec3 {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

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

export interface BackgroundShaderOptions {
  /** Animation speed multiplier. Default `1`. */
  speed?: number;
  /** Max device-pixel-ratio used when sizing the canvas. Default `1.5`. */
  maxDpr?: number;
  /** Swirl colors. Any omitted color falls back to the default. */
  colors?: BackgroundShaderColors;
}

export interface BackgroundShaderControls {
  /** Change the animation speed live. */
  setSpeed: (speed: number) => void;
  /** Change the swirl colors live. Any omitted color falls back to the default. */
  setColors: (colors: BackgroundShaderColors) => void;
  /** Stop the loop and free the GL objects. */
  destroy: () => void;
}

export interface BackgroundShaderHandle extends BackgroundShaderControls {
  /** The created `.cm-bg-shader` canvas. */
  canvas: HTMLCanvasElement;
}

/**
 * Run the swirling background shader on an existing canvas. Degrades to a
 * no-op (returning inert controls) when WebGL is unavailable. Honors
 * `prefers-reduced-motion` by painting a single still frame.
 */
export function attachBackgroundShader(canvas: HTMLCanvasElement, options: BackgroundShaderOptions = {}): BackgroundShaderControls {
  const { maxDpr = 1.5 } = options;
  let speed = options.speed ?? 1;
  let colors = (() => {
    const merged = { ...DEFAULT_COLORS, ...options.colors };
    return { deep: hexToVec3(merged.deep), warm: hexToVec3(merged.warm), cool: hexToVec3(merged.cool) };
  })();

  const noop: BackgroundShaderControls = {
    setSpeed: (s) => {
      speed = s;
    },
    setColors: () => {},
    destroy: () => {},
  };

  const gl = canvas.getContext('webgl');
  if (!gl) return noop;

  const prog = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  // Shaders can be freed once linked; keeping them attached leaks GPU objects.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[card-motion] BackgroundShader failed to link:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return noop;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uDeep = gl.getUniformLocation(prog, 'u_deep');
  const uWarm = gl.getUniformLocation(prog, 'u_warm');
  const uCool = gl.getUniformLocation(prog, 'u_cool');

  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const draw = (t: number) => {
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform3fv(uDeep, colors.deep);
    gl.uniform3fv(uWarm, colors.warm);
    gl.uniform3fv(uCool, colors.cool);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let elapsed = 0;
  const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const resize = () => {
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (reduce) draw(elapsed); // static: repaint on resize since there's no loop
  };
  resize();
  window.addEventListener('resize', resize);

  // Reduced motion: paint one still frame and stop — no perpetual animation.
  let raf = 0;
  if (reduce) {
    draw(0);
  } else {
    let last = performance.now();
    const loop = (now: number) => {
      elapsed += ((now - last) / 1000) * speed;
      last = now;
      draw(elapsed);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  return {
    setSpeed: (s) => {
      speed = s;
    },
    setColors: (next) => {
      const merged = { ...DEFAULT_COLORS, ...next };
      colors = { deep: hexToVec3(merged.deep), warm: hexToVec3(merged.warm), cool: hexToVec3(merged.cool) };
      if (reduce) draw(elapsed); // repaint the still frame with the new palette
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    },
  };
}

/**
 * A fullscreen, GPU-rendered swirling background (WebGL fragment shader),
 * framework-free: creates the `.cm-bg-shader` canvas inside `parent` and runs
 * the loop. Give the parent a position (or let the canvas be `fixed` via CSS).
 */
export function mountBackgroundShader(parent: HTMLElement, options: BackgroundShaderOptions & { className?: string } = {}): BackgroundShaderHandle {
  const canvas = document.createElement('canvas');
  canvas.className = `cm-bg-shader${options.className ? ` ${options.className}` : ''}`;
  parent.append(canvas);
  const controls = attachBackgroundShader(canvas, options);
  return {
    canvas,
    ...controls,
    destroy: () => {
      controls.destroy();
      canvas.remove();
    },
  };
}
