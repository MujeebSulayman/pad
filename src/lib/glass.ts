"use client";

/*
 * Liquid glass: a WebGL backdrop (a lit ribbon over a drifting share lattice) with every
 * element marked `data-lg` drawn as real refracting glass on top. Falls back to plain CSS
 * glass when WebGL is unavailable or too slow. Follows the site theme (light / dark).
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A highlight sliding along x (a row of links) or y (a column of links). `x`/`w` are position and size on that axis. */
type Spring = { el: HTMLElement; x: number; v: number; w: number; wv: number; tx: number; tw: number; axis: "x" | "y" };

const springs = new Map<unknown, Spring>();
const K = 520;
const C = 30;

function apply(s: Spring) {
  const stretch = Math.min(Math.abs(s.v) * 0.05, s.w * 0.6);
  const squash = Math.min(Math.abs(s.v) * 0.00028, 0.16);
  if (s.axis === "y") {
    s.el.style.height = `${s.w + stretch}px`;
    s.el.style.transform = `translateY(${(s.x - stretch / 2).toFixed(2)}px) scaleX(${(1 - squash).toFixed(3)})`;
    return;
  }
  s.el.style.width = `${s.w + stretch}px`;
  s.el.style.transform = `translateX(${(s.x - stretch / 2).toFixed(2)}px) scaleY(${(1 - squash).toFixed(3)})`;
}

export function springTo(key: unknown, el: HTMLElement, x: number, w: number, snap = false, axis: "x" | "y" = "x") {
  let s = springs.get(key);
  if (!s) {
    s = { el, x, v: 0, w, wv: 0, tx: x, tw: w, axis };
    springs.set(key, s);
    apply(s);
    return;
  }
  s.el = el;
  s.tx = x;
  s.tw = w;
  if (snap || reduced()) {
    s.x = x;
    s.w = w;
    s.v = s.wv = 0;
    apply(s);
  }
}

export function dropSpring(key: unknown) {
  springs.delete(key);
}

function stepSprings(dt: number) {
  springs.forEach((s) => {
    if (Math.abs(s.x - s.tx) < 0.05 && Math.abs(s.v) < 0.05 && Math.abs(s.w - s.tw) < 0.05) {
      if (s.v || s.wv) {
        s.x = s.tx;
        s.w = s.tw;
        s.v = s.wv = 0;
        apply(s);
      }
      return;
    }
    let a = -K * (s.x - s.tx) - C * s.v;
    s.v += a * dt;
    s.x += s.v * dt;
    a = -K * (s.w - s.tw) - C * s.wv;
    s.wv += a * dt;
    s.w += s.wv * dt;
    apply(s);
  });
}

const MAXS = 14;

// uL blends the dark scene (0) into the light one (1).
const FS = `
precision highp float;
uniform vec2 uRes; uniform float uScale; uniform float uTime; uniform vec2 uMouse; uniform float uScroll; uniform int uN;
uniform vec4 uRect[${MAXS}]; uniform vec4 uMeta[${MAXS}]; uniform vec4 uTint[${MAXS}]; uniform vec2 uRib; uniform float uL;

float blob(vec2 p, vec2 c, float r){ vec2 d = (p - c) / r; return exp(-dot(d, d)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 th(vec3 dark, vec3 light){ return mix(dark, light, uL); }

vec3 scene(vec2 p, float soft){
  vec2 q = p / uRes.y;
  q.y += uScroll / uRes.y * 0.18;
  float ar = uRes.x / uRes.y, t = uTime * 0.035;
  vec3 col = th(vec3(.010, .016, .022), vec3(.953, .937, .902));
  col = mix(col, th(vec3(.49, .84, 1.0), vec3(.70, .90, .97)), th(vec3(.16), vec3(.55)).x * blob(q, vec2(ar * .12 + .05 * sin(t * 1.1), -.05 + .05 * cos(t)), .55));
  col = mix(col, th(vec3(.05, .42, .58), vec3(.55, .80, .86)), th(vec3(.30), vec3(.45)).x * blob(q, vec2(ar * .78 + .08 * cos(t * .8), .02 + .06 * sin(t * .9)), .62));
  col = mix(col, th(vec3(.02, .09, .14), vec3(.90, .86, .78)), .45 * blob(q, vec2(ar * .22 + .06 * sin(t * .7), .60 + .08 * cos(t * .8)), .58));

  // The ribbon: a lit band of light sweeping across the page.
  vec2 qc = p / uRes.y; qc.y += uScroll / uRes.y * 0.88;
  float cx = qc.x / ar;
  float cy = uRib.x + .95 * pow(cx - .32 + .04 * sin(t * .8), 2.) + .03 * sin(cx * 6. + t * 1.4);
  float slope = (2. * .95 * (cx - .32) + .18 * cos(cx * 6. + t * 1.4)) / ar;
  float dd = (qc.y - cy) / sqrt(1. + slope * slope);
  float w = .085;
  float body = exp(-pow(dd / w, 2.));
  float edge = exp(-pow((dd + w * .55) / (w * .16), 2.));
  float haze = exp(-pow(dd / (w * 4.), 2.));
  float along = .5 + .5 * sin(cx * 2.6 + t * 1.2);
  vec3 bodyC = mix(th(vec3(.04, .30, .45), vec3(.04, .42, .53)), th(vec3(.18, .62, .85), vec3(.25, .66, .82)), along);
  bodyC = mix(bodyC, th(vec3(.49, .84, 1.0), vec3(.49, .84, 1.0)), smoothstep(.55, 1., cx) * .6);
  vec3 edgeC = th(mix(vec3(.75, .93, 1.0), vec3(.90, .98, 1.0), along), vec3(1.));
  vec3 lit = (bodyC * body * .62 + edgeC * edge * .95 + bodyC * haze * .10) * uRib.y;
  col = mix(col + lit, mix(col, bodyC, clamp(body * .55 + haze * .08, 0., 1.) * uRib.y) + edgeC * edge * .5 * uRib.y, uL);
  col += th(vec3(.10, .45, .62), vec3(0.)) * .22 * blob(qc, vec2(ar * .5, 3.35 + .05 * sin(t)), .55);

  // The share lattice: square cells that flip on and off like a slow Game of Life.
  float m = blob(qc, vec2(ar * .12, 1.18), .42) * (1. - soft);
  float cell = 11.0;
  vec2 id = floor(p / cell);
  vec2 g = mod(p, cell) - cell * .5;
  float alive = step(.62, hash(id + floor(uTime * .45 + hash(id) * 3.)));
  float sq = 1. - smoothstep(cell * .36 - .8, cell * .36 + .8, max(abs(g.x), abs(g.y)));
  col = mix(col, th(vec3(.49, .84, 1.0), vec3(.05, .05, .05)), sq * alive * m * th(vec3(.16), vec3(.10)).x);

  vec2 v = q / vec2(ar, 1.) - .5;
  col *= 1. - th(vec3(.35), vec3(.10)).x * dot(v, v);
  return clamp(col, 0., 1.);
}

float sdRB(vec2 p, vec2 h, float r){ vec2 q = abs(p) - h + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }

float field(vec2 p, float kind, out vec4 tint){
  float d = 1e5, best = 1e5; tint = vec4(0.);
  for (int i = 0; i < ${MAXS}; i++){
    if (i >= uN) break;
    if (abs(uMeta[i].y - kind) > .5) continue;
    vec4 r = uRect[i]; vec2 c = r.xy + r.zw * .5;
    float di = sdRB(p - c, r.zw * .5, min(uMeta[i].x, min(r.z, r.w) * .5));
    d = d > 9e4 ? di : smin(d, di, kind > .5 ? 9. : 2.);
    if (di < best){ best = di; tint = uTint[i]; }
  }
  return d;
}
float fieldD(vec2 p, float kind){ vec4 t; return field(p, kind, t); }

vec3 glass(vec2 p, float d, vec2 n, vec4 tint, float kind){
  float thick = kind > .5 ? 13. : 34.;
  float t = clamp(-d / thick, 0., 1.), e = 1. - t;
  float bend = pow(e, 1.7);
  vec2 off = -n * bend * thick * 1.15;
  float soft = kind > .5 ? .35 + .3 * t : smoothstep(0., .5, t) * .7;
  vec3 c;
  c.r = scene(p + off * 1.00, soft).r;
  c.g = scene(p + off * 1.03, soft).g;
  c.b = scene(p + off * 1.06, soft).b;
  float frost = kind > .5 ? .06 + .08 * t : mix(.04, .26, smoothstep(0., .5, t));
  c = mix(c, th(vec3(.022, .030, .040), vec3(.985, .975, .955)), frost);
  c = mix(c, tint.rgb, tint.a * (.6 + .4 * t));
  vec2 L = normalize(mix(vec2(-.35, -.94), normalize(uMouse - p + .001), .35));
  float facing = dot(n, L);
  float rim = pow(e, kind > .5 ? 5. : 7.);
  c += (max(facing, 0.) * .9 + .12) * rim * mix(.7, .45, uL);
  c += pow(max(-facing, 0.), 2.) * pow(e, 8.) * .25;
  c *= 1. - mix(.16, .08, uL) * smoothstep(.4, 1., e) * (.5 + .5 * max(-facing, 0.));
  float edgeLine = 1. - smoothstep(0., 1.3, abs(d + .6));
  c += edgeLine * (.16 + .45 * max(facing, 0.)) * mix(1., .6, uL);
  return c;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  vec3 col = scene(p, 0.);
  vec4 tS; float dS = field(p, 0., tS);
  float sh = fieldD(p - vec2(0., 16.), 0.);
  col *= 1. - mix(.5, .18, uL) * exp(-max(sh, 0.) / 30.) * step(0., dS);
  if (dS < 1.5){
    vec2 e = vec2(1., 0.);
    vec2 n = normalize(vec2(fieldD(p + e.xy, 0.) - fieldD(p - e.xy, 0.), fieldD(p + e.yx, 0.) - fieldD(p - e.yx, 0.)) + 1e-5);
    col = mix(col, glass(p, dS, n, tS, 0.), smoothstep(1., -1., dS));
  }
  vec4 tD; float dD = field(p, 1., tD);
  float shd = fieldD(p - vec2(0., 6.), 1.);
  col *= 1. - mix(.3, .12, uL) * exp(-max(shd, 0.) / 9.) * step(0., dD);
  if (dD < 1.5){
    vec2 e = vec2(1., 0.);
    vec2 n = normalize(vec2(fieldD(p + e.xy, 1.) - fieldD(p - e.xy, 1.), fieldD(p + e.yx, 1.) - fieldD(p - e.yx, 1.)) + 1e-5);
    col = mix(col, glass(p, dD, n, tD, 1.), smoothstep(1., -1., dD));
  }
  col += (hash(p + uTime) - .5) / 255.;
  gl_FragColor = vec4(col, 1.);
}`;
const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

// Glass tints per theme: [r, g, b, strength].
const TINTS: Record<"dark" | "light", Record<string, number[]>> = {
  dark: {
    surface: [0.016, 0.024, 0.032, 0.34],
    card: [0.016, 0.024, 0.032, 0.42],
    knob: [0.016, 0.024, 0.032, 0.58],
    steel: [0.72, 0.88, 0.95, 0.1],
  },
  light: {
    surface: [0.99, 0.98, 0.96, 0.34],
    card: [0.99, 0.98, 0.96, 0.46],
    knob: [1, 1, 1, 0.62],
    steel: [1, 1, 1, 0.2],
  },
};

const isPhone = () => window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const isLight = () => document.documentElement.dataset.theme !== "dark";

function makeGL(cv: HTMLCanvasElement) {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {}
  if (!gl) return null;
  const g = gl;
  const sh = (type: number, src: string) => {
    const s = g.createShader(type)!;
    g.shaderSource(s, src);
    g.compileShader(s);
    return g.getShaderParameter(s, g.COMPILE_STATUS) ? s : null;
  };
  const v = sh(g.VERTEX_SHADER, VS);
  const f = sh(g.FRAGMENT_SHADER, FS);
  if (!v || !f) return null;
  const prog = g.createProgram()!;
  g.attachShader(prog, v);
  g.attachShader(prog, f);
  g.linkProgram(prog);
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) return null;
  g.useProgram(prog);
  const b = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, b);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
  const loc = g.getAttribLocation(prog, "a");
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
  const U: Record<string, WebGLUniformLocation | null> = {};
  for (const n of ["uRes", "uScale", "uTime", "uMouse", "uScroll", "uN", "uRect", "uMeta", "uTint", "uRib", "uL"]) {
    U[n] = g.getUniformLocation(prog, n);
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.deviceMemory && nav.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  let scale = Math.min(window.devicePixelRatio || 1, isPhone() ? (weak ? 0.55 : 0.75) : 1.25);
  const rect = new Float32Array(MAXS * 4);
  const meta = new Float32Array(MAXS * 4);
  const tint = new Float32Array(MAXS * 4);
  const morph = new WeakMap<Element, { x: number; v: number; start: number }>();
  const t0 = performance.now();
  let light = isLight() ? 1 : 0;
  let frames = 0;
  let acc = 0;
  let on = true;

  const resize = () => {
    cv.width = Math.round(cv.clientWidth * scale);
    cv.height = Math.round(cv.clientHeight * scale);
    g.viewport(0, 0, cv.width, cv.height);
  };
  resize();

  const collect = (now: number, dt: number) => {
    let n = 0;
    if (document.documentElement.classList.contains("scrolling")) return 0;
    const H = window.innerHeight;
    const tints = TINTS[isLight() ? "light" : "dark"];
    for (const el of document.querySelectorAll<HTMLElement>("[data-lg]")) {
      if (n >= MAXS) break;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.bottom < -60 || r.top > H + 60) continue;
      const kind = el.dataset.lg === "drop" ? 1 : 0;
      let m = morph.get(el);
      if (!m) {
        m = { x: reduced() ? 1 : 0, v: 0, start: now };
        morph.set(el, m);
      }
      // New glass grows out of a small pill with a spring.
      if ((now >= m.start && m.x < 1.0005) || Math.abs(m.v) > 0.001) {
        const a = -70 * (m.x - 1) - 15 * m.v;
        m.v += a * dt;
        m.x += m.v * dt;
      }
      if ((m.x > 0.55 || now - m.start > 900) && !el.classList.contains("lg-shown")) el.classList.add("lg-shown");
      const k = Math.max(0, m.x);
      const w0 = kind ? Math.min(r.height, r.width) : Math.min(r.width, 140);
      const h0 = kind ? r.height * 0.8 : Math.min(r.height, 60);
      const w = w0 + (r.width - w0) * k;
      const h = h0 + (r.height - h0) * Math.min(1.08, k);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      rect.set([cx - w / 2, cy - h / 2, w, h], n * 4);
      const rad = el.dataset.lgR ? Number(el.dataset.lgR) : r.height / 2;
      meta.set([rad, kind, 0, 0], n * 4);
      tint.set(tints[el.dataset.lgTint ?? ""] ?? (kind ? tints.knob : tints.surface), n * 4);
      n++;
    }
    return n;
  };

  return {
    get on() {
      return on;
    },
    resize,
    draw(now: number, dt: number, mouse: [number, number]) {
      if (!on) return;
      const n = collect(now, Math.min(dt, 1 / 30));
      // Ease between themes instead of snapping.
      light += ((isLight() ? 1 : 0) - light) * Math.min(1, dt * 6);
      g.uniform2f(U.uRes, cv.clientWidth, cv.clientHeight);
      g.uniform1f(U.uScale, scale);
      g.uniform1f(U.uTime, reduced() ? 0 : (now - t0) / 1000);
      g.uniform2f(U.uMouse, mouse[0], mouse[1]);
      g.uniform1f(U.uScroll, window.scrollY);
      g.uniform1i(U.uN, n);
      g.uniform4fv(U.uRect, rect);
      g.uniform4fv(U.uMeta, meta);
      g.uniform4fv(U.uTint, tint);
      g.uniform1f(U.uL, light);
      const home = window.location.pathname === "/";
      // The ribbon sweeps across the hero on the home page and sits low elsewhere.
      g.uniform2f(U.uRib, home ? 0.6 : -0.22, home ? 1 : 0.55);
      g.drawArrays(g.TRIANGLES, 0, 3);
      // Drop resolution, then switch off entirely, if frames are too slow.
      frames++;
      acc += dt;
      if (frames === 60) {
        const avg = (acc / frames) * 1000;
        frames = 0;
        acc = 0;
        if (avg > 24 && scale > 0.5) {
          scale = Math.max(0.5, scale * 0.72);
          resize();
        } else if (avg > 30) this.off();
      }
    },
    off() {
      on = false;
      document.documentElement.classList.remove("gl");
      cv.style.display = "none";
      document.querySelectorAll("[data-lg]").forEach((el) => el.classList.add("lg-shown"));
    },
  };
}

/** A displacement map for the SVG lens that refracts the page behind the nav (Chromium only). */
function lensMap(w: number, h: number, r: number) {
  const s = 0.5;
  const cw = Math.max(2, Math.ceil(w * s));
  const ch = Math.max(2, Math.ceil(h * s));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(cw, ch);
  const D = img.data;
  const bevel = Math.min(26, h * 0.46);
  const hw = w / 2;
  const hh = h / 2;
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const px = (x + 0.5) / s - hw;
      const py = (y + 0.5) / s - hh;
      const qx = Math.abs(px) - (hw - r);
      const qy = Math.abs(py) - (hh - r);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const ol = Math.hypot(ox, oy);
      const d = ol + Math.min(Math.max(qx, qy), 0) - r;
      let nx: number;
      let ny: number;
      if (qx > 0 && qy > 0) {
        nx = (Math.sign(px) * ox) / ol;
        ny = (Math.sign(py) * oy) / ol;
      } else if (qx > qy) {
        nx = Math.sign(px);
        ny = 0;
      } else {
        nx = 0;
        ny = Math.sign(py);
      }
      const e = Math.min(1, Math.max(0, 1 + d / bevel));
      const bend = e * e;
      const i = (y * cw + x) * 4;
      D[i] = 128 - nx * bend * 127;
      D[i + 1] = 128 - ny * bend * 127;
      D[i + 2] = 128;
      D[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function buildNavLens() {
  const ua = navigator.userAgent;
  const can = !!(window as unknown as { chrome?: unknown }).chrome && /Chrome\/|Edg\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (!can) return;
  const html = document.documentElement;
  const phone = isPhone();
  html.classList.toggle("svgref", !phone);
  html.classList.toggle("svgref1", phone);
  // The top nav on desktop, the tab bar on phones: whichever bar is on screen gets the lens.
  const bar = ["nav", "tabbar"].map((id) => document.getElementById(id)).find((el) => !!el && el.getBoundingClientRect().width > 10);
  if (!bar) return;
  const r = bar.getBoundingClientRect();
  const radius = Number(bar.dataset.lensR) || Math.min(r.width, r.height) / 2;
  const url = lensMap(r.width, r.height, Math.min(radius, r.width / 2, r.height / 2));
  for (const id of ["lgmapA", "lgmapB"]) {
    const fe = document.getElementById(id);
    if (!fe) continue;
    fe.setAttribute("href", url);
    fe.setAttribute("width", String(r.width));
    fe.setAttribute("height", String(r.height));
  }
}

export function startGlass(cv: HTMLCanvasElement) {
  const html = document.documentElement;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.deviceMemory && nav.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  html.classList.toggle("lite", !!weak);
  const gl = makeGL(cv);
  if (gl) html.classList.add("gl");
  else cv.style.display = "none";
  let mouse: [number, number] = [window.innerWidth * 0.3, -300];
  let lightX = window.innerWidth * 0.3;
  const onMove = (e: PointerEvent) => {
    mouse = [e.clientX, e.clientY];
    lightX = e.clientX;
    if (reduced() || html.classList.contains("lite")) return;
    // Panels catch a soft highlight under the pointer.
    const el = (e.target as Element | null)?.closest?.(".glass") as HTMLElement | null;
    if (!el) return;
    const b = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - b.left}px`);
    el.style.setProperty("--my", `${e.clientY - b.top}px`);
  };
  let lensT: ReturnType<typeof setTimeout> | undefined;
  let still: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    if (gl?.on) gl.resize();
    clearTimeout(lensT);
    lensT = setTimeout(buildNavLens, 200);
  };
  // While scrolling, glass falls back to CSS so the backdrop never lags behind the page.
  const onScroll = () => {
    if (!html.classList.contains("scrolling")) html.classList.add("scrolling");
    clearTimeout(still);
    still = setTimeout(() => html.classList.remove("scrolling"), 160);
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onScroll, { passive: true });
  window.addEventListener("touchmove", onScroll, { passive: true });
  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    if (!document.hidden) {
      stepSprings(dt);
      gl?.draw(now, dt || 1 / 60, mouse);
      const n = document.getElementById("nav");
      if (n) n.style.setProperty("--mx", `${lightX - n.getBoundingClientRect().left}px`);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  setTimeout(buildNavLens, 50);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("wheel", onScroll);
    window.removeEventListener("touchmove", onScroll);
    clearTimeout(lensT);
    clearTimeout(still);
    html.classList.remove("scrolling");
  };
}
