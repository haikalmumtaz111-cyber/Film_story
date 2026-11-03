// Gouache poster painter (Canvas 2D).
// The model: every form is first laid as an opaque mid-tone base (with a three-value underlayer along the light),
// then painted with directional strokes that follow the form, each stroke snapped to one of three values
// (light / mid / shadow) with a dithered, soft-blended border; sharp warm-cream highlights go on lit edges last.
// Strokes are generated from fixed seeds in a form's own (u, v) space, so moving forms carry their paint with them.
import { clamp, lerp, hash } from '/core/lib.js';

// ---------- colour ----------
export const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const lum = c => (c[0] * .3 + c[1] * .59 + c[2] * .11) / 255;

// The style's fixed colours (STYLE.md §3)
export const P = {
  cobalt: hex('#1F4D97'), pale: hex('#A9C3D6'), cream: hex('#F4E0B6'), ground: hex('#EEC27A'),
  ochre: hex('#B56A33'), violet: hex('#6C6394'), hi: hex('#FFEFC9'), umber: hex('#4A2A1C'),
};

// Three values of one local colour: light warms toward cream, shadow cools toward violet (never toward black).
export function tones(base, o = {}) {
  const b = typeof base === 'string' ? hex(base) : base;
  const lite = mix(b, o.light || P.cream, o.lk ?? .42);
  const dark = mul(mix(b, o.shadow || P.violet, o.dk ?? .42), o.dd ?? .78);
  return [dark, b, lite];
}

// ---------- seeded helpers ----------
export const H = (s, k = 0) => hash(s * 12.9898 + k * 78.233 + 0.123);
export const R = (s, k, a, b) => a + (b - a) * H(s, k);

// ---------- a single gouache stroke ----------
// x,y centre; ang direction; len,wid in px; col rgb; s seed. o.dry = dry-brush, o.alpha, o.bend, o.bristle
export function stroke(ctx, x, y, ang, len, wid, col, s, o = {}) {
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
  const bend = (o.bend ?? R(s, 1, -.12, .12)) * len;
  const jit = 1 + R(s, 2, -.045, .045);
  const c = mul(col, jit);
  if (o.dry) return dry(ctx, x, y, ca, sa, nx, ny, len, wid, c, s, bend, o);
  const N = 6, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const k = i / N, sx = (k - .5) * len;
    const off = bend * (.25 - (k - .5) * (k - .5));
    // width profile: blunt rounded start, full body, ragged lifting end
    const prof = Math.min(1, Math.sin(Math.min(1, k * 4.5) * Math.PI / 2) * 1.0) * (1 - Math.pow(k, 5) * .55);
    const rag = 1 + (H(s, 10 + i) - .5) * .22;
    const w = wid * .5 * prof * rag;
    const cx = x + ca * sx + nx * off, cy = y + sa * sx + ny * off;
    top.push(cx + nx * w, cy + ny * w); bot.push(cx - nx * w * (1 + (H(s, 30 + i) - .5) * .18), cy - ny * w * (1 + (H(s, 30 + i) - .5) * .18));
  }
  ctx.globalAlpha = o.alpha ?? .93;
  ctx.fillStyle = css(c);
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  for (let i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
  for (let i = bot.length - 2; i >= 0; i -= 2) ctx.lineTo(bot[i], bot[i + 1]);
  ctx.closePath(); ctx.fill();
  if (o.bristle !== false && wid > 3.5) {          // bristle streaks: two thin lines along the stroke
    ctx.lineWidth = Math.max(.6, wid * .13); ctx.lineCap = 'round';
    for (let j = 0; j < 2; j++) {
      const v = (j ? .26 : -.22) * wid, k0 = R(s, 50 + j, .02, .25), k1 = R(s, 52 + j, .6, .95);
      const lt = j ? 1.07 : .93;
      ctx.globalAlpha = (o.alpha ?? .93) * .32;
      ctx.strokeStyle = css(mul(c, lt));
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const k = lerp(k0, k1, i / 4), sx = (k - .5) * len, off = bend * (.25 - (k - .5) * (k - .5)) + v;
        const px = x + ca * sx + nx * off, py = y + sa * sx + ny * off;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// dry-brush: broken parallel bristle trails (dust, cloth edges, distant figures only)
function dry(ctx, x, y, ca, sa, nx, ny, len, wid, c, s, bend, o) {
  const n = Math.max(3, Math.round(wid / 1.6));
  ctx.lineCap = 'round'; ctx.strokeStyle = css(c);
  for (let j = 0; j < n; j++) {
    const v = ((j + .5) / n - .5) * wid;
    const k0 = R(s, 70 + j, 0, .35), k1 = R(s, 90 + j, .45, 1);
    if (H(s, 110 + j) < .22) continue;
    ctx.globalAlpha = (o.alpha ?? .85) * R(s, 130 + j, .45, 1);
    ctx.lineWidth = Math.max(.7, wid / n * R(s, 150 + j, .6, 1.3));
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const k = lerp(k0, k1, i / 3), sx = (k - .5) * len, off = bend * (.25 - (k - .5) * (k - .5)) + v;
      const px = x + ca * sx + nx * off, py = y + sa * sx + ny * off;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// pick one of three tones from a continuous value v (-1 shadow … +1 light), dithered across soft borders
export function pickTone(tn, v, s, lo = -.22, hi = .3, soft = .14) {
  const d = H(s, 7) * 2 - 1;
  const vv = v + d * soft;
  if (vv > hi) return tn[2];
  if (vv < lo) return tn[0];
  return tn[1];
}

// ---------- ribbons: the form primitive (limbs, torso, cloth, sheaves, heads) ----------
// spine(u) -> [x,y] in px (u 0..1), width(u) -> px. Strokes live in (u,v) space and are generated once per id.
const RIB = new Map();
function ribbonStrokes(id, len, wmax, size, dens) {
  const key = id + '|' + Math.round(len / 4) + '|' + Math.round(wmax / 4) + '|' + size.toFixed(1);
  let st = RIB.get(key); if (st) return st;
  st = [];
  const seed = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0) & 0xffffff, 7);
  const nu = Math.max(2, Math.ceil(len / (size * .95) * dens)), nv = Math.max(1, Math.ceil(wmax / (size * .48) * dens));
  let k = 0;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const s = seed + (k++) * 1.618;
    st.push({ u: (i + .5 + (H(s, 1) - .5) * .9) / nu, v: ((j + .5 + (H(s, 2) - .5) * .8) / nv) * 2 - 1, s, a: R(s, 3, -.2, .2), l: R(s, 4, 1.5, 2.5), w: R(s, 5, .5, .72) });
  }
  // shuffle draw order by seed so overlaps don't read as rows
  st.sort((p, q) => H(p.s, 9) - H(q.s, 9));
  RIB.set(key, st);
  return st;
}

export const sampleSpine = (spine, n = 24) => { const p = []; for (let i = 0; i <= n; i++) p.push(spine(i / n)); return p; };

// light: unit vector toward the light, in screen space; o.tn tones; o.size stroke size px; o.dir 'along'|'across'
// o.fold(u,v) adds folds; o.bias shifts value; o.rim adds lit-edge highlights; o.dryEdge dry-brush on the trailing edge
export function ribbon(ctx, id, spine, width, o) {
  const n = o.samples || 20, pts = sampleSpine(spine, n);
  let len = 0, wmax = 0;
  for (let i = 1; i <= n; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const W = []; for (let i = 0; i <= n; i++) { W.push(width(i / n)); wmax = Math.max(wmax, W[i]); }
  if (len < 1) return;
  const T = [], Nn = [];
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    T.push([tx, ty]); Nn.push([-ty, tx]);
  }
  const at = u => { const f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return [i, k]; };
  const map = (u, v) => {
    const [i, k] = at(u), p0 = pts[i], p1 = pts[i + 1], w = lerp(W[i], W[i + 1], k) * .5;
    const nx = lerp(Nn[i][0], Nn[i + 1][0], k), ny = lerp(Nn[i][1], Nn[i + 1][1], k);
    return [lerp(p0[0], p1[0], k) + nx * v * w, lerp(p0[1], p1[1], k) + ny * v * w, nx, ny, lerp(T[i][0], T[i + 1][0], k), lerp(T[i][1], T[i + 1][1], k)];
  };
  const L = o.light, tn = o.tn, size = o.size;
  const val = (u, v, nx, ny) => {
    const cyl = (nx * L[0] + ny * L[1]) * Math.sin(v * Math.PI / 2) * (o.round ?? .95);
    return cyl + (o.bias || 0) + (o.fold ? o.fold(u, v) : 0);
  };
  // 1. opaque mid-tone base with a three-value underlayer along the light
  const cap0 = o.cap0 ?? .5, cap1 = o.cap1 ?? .5;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const w = W[i] * .5; i ? ctx.lineTo(pts[i][0] + Nn[i][0] * w, pts[i][1] + Nn[i][1] * w) : ctx.moveTo(pts[i][0] + Nn[i][0] * w, pts[i][1] + Nn[i][1] * w); }
  { const w = W[n] * .5, e = T[n]; ctx.quadraticCurveTo(pts[n][0] + e[0] * w * cap1 * 2, pts[n][1] + e[1] * w * cap1 * 2, pts[n][0] - Nn[n][0] * w, pts[n][1] - Nn[n][1] * w); }
  for (let i = n; i >= 0; i--) { const w = W[i] * .5; ctx.lineTo(pts[i][0] - Nn[i][0] * w, pts[i][1] - Nn[i][1] * w); }
  { const w = W[0] * .5, e = T[0]; ctx.quadraticCurveTo(pts[0][0] - e[0] * w * cap0 * 2, pts[0][1] - e[1] * w * cap0 * 2, pts[0][0] + Nn[0][0] * w, pts[0][1] + Nn[0][1] * w); }
  ctx.closePath();
  const mid = pts[n >> 1], r = Math.max(len, wmax) * .5;
  const bmid = o.bias ? (o.bias > .25 ? tn[2] : o.bias < -.25 ? tn[0] : tn[1]) : tn[1];
  const g = ctx.createLinearGradient(mid[0] - L[0] * r, mid[1] - L[1] * r, mid[0] + L[0] * r, mid[1] + L[1] * r);
  g.addColorStop(0, css(mix(tn[0], bmid, .35))); g.addColorStop(.5, css(bmid)); g.addColorStop(1, css(mix(bmid, tn[2], .45)));
  ctx.fillStyle = g; ctx.globalAlpha = 1; ctx.fill();
  if (o.baseOnly) return;
  // 2. directional strokes following the form
  const st = ribbonStrokes(id, len, wmax, size, o.dens || 1);
  const vmax = o.vmax ?? .86;
  for (const p of st) {
    const v = p.v * vmax;
    const [x, y, nx, ny, tx, ty] = map(p.u, v);
    let a = Math.atan2(ty, tx); if (o.dir === 'across') a += Math.PI / 2;
    const col = pickTone(tn, val(p.u, v, nx, ny), p.s, o.lo, o.hi);
    const wloc = lerp(W[Math.min(n, Math.floor(p.u * n))], W[Math.min(n, Math.ceil(p.u * n))], .5);
    const sz = Math.min(size, Math.max(1.5, wloc * .55));
    const dryHere = o.dryEdge && p.u > o.dryEdge && H(p.s, 21) < .7;
    stroke(ctx, x, y, a + p.a, sz * p.l, sz * p.w, col, p.s, { dry: dryHere, alpha: o.alpha });
  }
  // 3. sharp warm-cream highlights on the lit edge, last
  if (o.rim) {
    const step = Math.max(2, size * (o.rimStep || 1.1)), hiC = o.hiC || P.hi;
    let acc = 0;
    for (let i = 1; i <= n; i++) {
      const seglen = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      acc += seglen;
      while (acc > step) {
        acc -= step;
        const u = (i - acc / Math.max(seglen, 1e-3)) / n;
        for (const side of [1, -1]) {
          const [x, y, nx, ny, tx, ty] = map(u, side * (o.rimIn ?? .8));
          const lit = (nx * side) * L[0] + (ny * side) * L[1];
          const s = H(i * 7.1 + side, u * 91.3) * 1000;
          if (lit > (o.rimT ?? .45) && H(s, 1) < (o.rimP ?? .62) * Math.min(1, (lit - (o.rimT ?? .45)) * 4 + .3) && u > (o.rimU0 ?? 0) && u < (o.rimU1 ?? 1))
            stroke(ctx, x, y, Math.atan2(ty, tx) + R(s, 2, -.1, .1), step * R(s, 3, .8, 2.1), Math.max(1.2, size * (o.rimW || .26) * R(s, 4, .6, 1.25)), mix(hiC, P.cream, H(s, 5) * .5), s, { alpha: R(s, 6, .75, .97), bristle: false, bend: R(s, 7, -.08, .08) });
        }
      }
    }
  }
  return map;
}

// ---------- regions: static areas painted from a colour field (sky, ground, clouds, rocks) ----------
// test(x,y) -> bool inside; colorAt(x,y,s) -> rgb; dirAt(x,y) -> angle; sizeAt(x,y) -> px
export function region(ctx, box, f) {
  const [x0, y0, x1, y1] = box;
  const sp0 = f.spacing || .62;
  let y = y0, row = 0;
  const list = [];
  while (y < y1) {
    const szr = f.sizeAt(x0, y);
    let x = x0 - (row % 2) * szr * .5, col = 0;
    while (x < x1) {
      const sz = f.sizeAt(x, y), s = (f.seed || 1) * 1000 + row * 7919 + col * 104.729;
      const px = x + (H(s, 1) - .5) * sz * .9, py = y + (H(s, 2) - .5) * sz * .7;
      if (f.test(px, py)) list.push([px, py, sz, s]);
      x += sz * sp0 * (f.ax || 1.6); col++;
    }
    y += szr * sp0 * (f.ay || .55); row++;
  }
  list.sort((a, b) => H(a[3], 9) - H(b[3], 9));
  for (const [px, py, sz, s] of list) {
    const c = f.colorAt(px, py, s);
    if (!c) continue;
    const a = f.dirAt(px, py, s) + R(s, 3, -.2, .2) * (f.jit ?? 1);
    stroke(ctx, px, py, a, sz * R(s, 4, 1.5, 2.5) * (f.lenMul || 1), sz * R(s, 5, .5, .72), c, s, { dry: f.dry ? f.dry(px, py, s) : false, alpha: f.alpha });
  }
}

// cloud masses: a union of flattened billows, lit as soft spheres from the sun, darker toward the base.
// Strokes run along each billow but are flattened toward the horizontal (no swirls).
export function clouds(ctx, balls, f) {
  const sq = f.squash ?? .78;
  const E = balls.map(([x, y, r]) => [x, y, r * 1.22, r * sq]);
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y, rx, ry] of E) { box[0] = Math.min(box[0], x - rx); box[1] = Math.min(box[1], y - ry); box[2] = Math.max(box[2], x + rx); box[3] = Math.max(box[3], y + ry); }
  const dist = (b, x, y) => Math.hypot((x - b[0]) / b[2], (y - b[1]) / b[3]);
  const near = (x, y) => { let best = null; for (let i = E.length - 1; i >= 0; i--) if (dist(E[i], x, y) < 1) { best = E[i]; break; } return best; };   // the front-most billow
  const yb0 = box[1], yb1 = box[3];
  const inside = (x, y) => { for (const b of E) if (dist(b, x, y) < 1) return true; return false; };
  // value: lit where a step toward the sun leaves the whole mass (coherent sun side), plus a little billow roundness
  const L = f.light, d1 = f.d1 ?? f.size * 2.6, d2 = f.d2 ?? f.size * 8;
  const val = (x, y, b) => {
    const dx = (x - b[0]) / b[2], dy = (y - b[1]) / b[3];
    const ex = (!inside(x + L[0] * d1, y + L[1] * d1) ? 1 : 0) + (!inside(x + L[0] * d2, y + L[1] * d2) ? .6 : 0);
    const dz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
    return ex - .38 + (dx * L[0] + dy * L[1]) * .55 + (1 - dz) * -.15 - (y - yb0) / (yb1 - yb0) * .4 + (f.bias || 0);
  };
  // base: every billow as an ellipse, back to front, in its own mean value
  for (const b of E) {
    const g = ctx.createLinearGradient(b[0] - f.light[0] * b[2], b[1] - f.light[1] * b[3], b[0] + f.light[0] * b[2], b[1] + f.light[1] * b[3]);
    g.addColorStop(0, css(f.tn[0])); g.addColorStop(.6, css(mix(f.tn[0], f.tn[1], .7))); g.addColorStop(1, css(f.tn[1]));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(b[0], b[1], b[2] * .98, b[3] * .98, 0, 0, Math.PI * 2); ctx.fill();
  }
  region(ctx, box, {
    seed: f.seed, spacing: .58,
    sizeAt: f.sizeAt || (() => f.size),
    test: (x, y) => { for (const b of E) if (dist(b, x, y) < .95) return true; return false; },
    colorAt: (x, y, s) => { const b = near(x, y); return b ? pickTone(f.tn, val(x, y, b), s, f.lo ?? -.1, f.hi ?? .45, .14) : null; },
    dirAt: (x, y, s) => { const b = near(x, y); if (!b) return 0; const a = Math.atan2((y - b[1]) / b[3], (x - b[0]) / b[2]) + Math.PI / 2; return Math.atan2(Math.sin(a) * .25, Math.cos(a)); },
    jit: 1.6, lenMul: 1.15,
  });
  // lit-edge highlights where a billow's rim faces the sun and is not buried in another billow
  if (f.rim) for (const b of E) {
    const n = Math.ceil((b[2] + b[3]) * Math.PI / (f.size * 1.2));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, nx = Math.cos(a), ny = Math.sin(a);
      const lit = nx * f.light[0] + ny * f.light[1];
      const x = b[0] + nx * b[2] * .9, y = b[1] + ny * b[3] * .9, s = b[0] * 3.1 + b[1] * 7.7 + i;
      if (lit < .5 || H(s, 1) > .75) continue;
      let buried = inside(x + nx * f.size * 1.5, y + ny * f.size * 1.5) || !inside(x - nx * f.size * .5, y - ny * f.size * .5); for (const q of E) if (q !== b && dist(q, x, y) < .85) { buried = true; break; }
      if (buried) continue;
      stroke(ctx, x, y, a + Math.PI / 2, f.size * R(s, 2, 1.2, 2.2), f.size * R(s, 4, .22, .4), mix(f.rim, f.tn[2], H(s, 3) * .5), s, { bristle: false, alpha: .9 });
    }
  }
}

// ---------- surfaces ----------
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
const CACHE = new Map();
export function cached(key, w, h, draw) {
  let c = CACHE.get(key); if (c) return c;
  c = canvas(w, h); const x = c.getContext('2d'); draw(x, c); CACHE.set(key, c); return c;
}

// board grain ±3 %, as a repeating pattern anchored to the painting
let GRAIN = null;
export function grainPattern(ctx) {
  if (!GRAIN) {
    const c = canvas(512, 512), x = c.getContext('2d'), d = x.createImageData(512, 512);
    for (let i = 0; i < 512 * 512; i++) {
      const px = i % 512, py = (i / 512) | 0;
      // board fibre: fine noise plus faint horizontal tooth
      const n = (hash(i * .7311) - .5) * 1.0 + (hash(py * 3.17 + Math.floor(px / 7) * 11.3) - .5) * .5;
      const v = 128 + n * 13;
      d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255;
    }
    x.putImageData(d, 0, 0); GRAIN = c;
  }
  return ctx.createPattern(GRAIN, 'repeat');
}

// finishing: haze band, warm vignette, board grain (grain transform = the painting's transform)
export function finish(ctx, W, H, o = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.haze) {   // warm haze rising from the horizon
    const g = ctx.createLinearGradient(0, o.haze.y - o.haze.h, 0, o.haze.y + o.haze.h * .4);
    g.addColorStop(0, css(o.haze.c, 0)); g.addColorStop(.7, css(o.haze.c, o.haze.a)); g.addColorStop(1, css(o.haze.c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, o.haze.y - o.haze.h, W, o.haze.h * 1.4);
  }
  // warm vignette
  ctx.globalCompositeOperation = 'multiply';
  const v = ctx.createRadialGradient(W * .5, H * .48, H * .35, W * .5, H * .5, H * 1.05);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, `rgba(150,92,52,1)`);
  ctx.globalAlpha = o.vig ?? .55; ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  // board grain
  ctx.globalCompositeOperation = 'overlay';
  const p = grainPattern(ctx);
  const m = o.grainM || [1, 0, 0, 1, 0, 0];
  p.setTransform(new DOMMatrix(m));
  ctx.globalAlpha = o.grain ?? .55; ctx.fillStyle = p; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// directional brush blur for whip pans: the frame smeared along the move
export function whipBlur(ctx, src, W, H, dx, dy) {
  const n = 9, m = Math.hypot(dx, dy);
  if (m < 2) { ctx.drawImage(src, 0, 0); return; }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.drawImage(src, 0, 0);
  for (let i = 0; i < n; i++) {
    const k = (i / (n - 1) - .5);
    ctx.globalAlpha = 1 / (i + 2);
    ctx.drawImage(src, k * dx, k * dy);
  }
  ctx.restore();
}
