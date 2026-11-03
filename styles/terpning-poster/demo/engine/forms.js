// Forms drawn first, then painted (STYLE.md §2).
// A form is a closed contour in its own units. Its three values come from the light: a point is lit when a short
// step toward the light leaves the form, half-lit when a longer step does, in shadow otherwise. That one test turns
// any silhouette into a solid, three-value form with a soft-blended terminator.
import { clamp, lerp } from '/core/lib.js';
import { stroke, tones, css, mix, mul, P, H, R, hex } from './gouache.js';

// Catmull-Rom → cubic Bézier Path2D. sharp: indices kept as corners.
export function smooth(pts, closed = true, sharp = []) {
  const p = new Path2D(), n = pts.length, g = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), k = 1 / 6;
    const s1 = sharp.includes(i) ? 0 : k, s2 = sharp.includes((i + 1) % n) ? 0 : k;
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * s1, p1[1] + (p2[1] - p0[1]) * s1, p2[0] - (p3[0] - p1[0]) * s2, p2[1] - (p3[1] - p1[1]) * s2, p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}
// dense sample of the smoothed contour (for rim lights and bounds)
export function contour(pts, per = 6) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  return out;
}

// limb contour from a centre line (joints) and widths at each joint; bulge pushes one side out between joints
export function limb(J, Wd, o = {}) {
  const left = [], right = [], n = J.length, steps = o.steps || 4;
  for (let i = 0; i < n - 1; i++) for (let s = 0; s < steps; s++) {
    const k = s / steps, a = J[i], b = J[i + 1];
    const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k), dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    const nx = -dy / m, ny = dx / m, w = lerp(Wd[i], Wd[i + 1], k) * .5;
    const bl = Math.sin(k * Math.PI) * (o.bulgeL?.[i] || 0), br = Math.sin(k * Math.PI) * (o.bulgeR?.[i] || 0);
    left.push([x + nx * (w + bl), y + ny * (w + bl)]); right.push([x - nx * (w + br), y - ny * (w + br)]);
  }
  const a = J[n - 2], b = J[n - 1], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m, w = Wd[n - 1] * .5;
  left.push([b[0] + nx * w, b[1] + ny * w]); right.push([b[0] - nx * w, b[1] - ny * w]);
  const capE = [b[0] + dx / m * w * .8, b[1] + dy / m * w * .8];
  const a0 = J[0], b0 = J[1], d0x = b0[0] - a0[0], d0y = b0[1] - a0[1], m0 = Math.hypot(d0x, d0y) || 1;
  const capS = [a0[0] - d0x / m0 * Wd[0] * .4, a0[1] - d0y / m0 * Wd[0] * .4];
  return [capS, ...left, capE, ...right.reverse()];
}
export const xform = (pts, f) => pts.map(p => f(p));
export const rotAbout = (c, a) => p => { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; };
export const ellipse = (cx, cy, rx, ry, n = 14, rot = 0) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return o; };

const TEST = document.createElement('canvas').getContext('2d');
const inP = (path, x, y) => TEST.isPointInPath(path, x, y);

// one scratch surface reused by every form: the form is painted there with 'source-atop' so its own
// antialiased silhouette clips the base and the strokes (no light fringe on the shadow side), then stamped down.
let SCR = null, SX = null;
function scratch(w, h) {
  if (!SCR || SCR.width < w || SCR.height < h) { SCR = document.createElement('canvas'); SCR.width = Math.max(w, SCR?.width || 0); SCR.height = Math.max(h, SCR?.height || 0); SX = SCR.getContext('2d'); }
  SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalCompositeOperation = 'source-over'; SX.globalAlpha = 1; SX.clearRect(0, 0, w + 2, h + 2);
  return SX;
}

// paint one form. f: {pts, col | tn, dir (angle | (x,y)=>angle), size, d1, d2, light, rim, seed, sharp, bias, dry, fold(x,y)->±1}
export function form(ctx, f) {
  const path = smooth(f.pts, true, f.sharp || []);
  const L = f.light, tn = f.tn || tones(f.col, f.tk || {});
  const d1 = f.d1 ?? 14, d2 = f.d2 ?? 42, b = f.bias || 0;
  // the light test runs against the whole solid this form belongs to (a skirt under a bodice is not lit at its waist)
  const solids = [path, ...(f.solid || []).map(q => q instanceof Path2D ? q : smooth(q))];
  const shift = (d) => { const p = new Path2D(); for (const q of solids) p.addPath(q, new DOMMatrix([1, 0, 0, 1, -L[0] * d, -L[1] * d])); return p; };
  const inS = (x, y) => { for (const q of solids) if (inP(q, x, y)) return true; return false; };
  const pts = f.pts; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const sz = f.size, pad = sz * 1.5;
  // device-space box of the form
  const m = ctx.getTransform();
  const cs = [[x0 - pad, y0 - pad], [x1 + pad, y0 - pad], [x0 - pad, y1 + pad], [x1 + pad, y1 + pad]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  const dx0 = Math.floor(Math.min(...cs.map(c => c[0]))), dy0 = Math.floor(Math.min(...cs.map(c => c[1])));
  const dw = Math.ceil(Math.max(...cs.map(c => c[0]))) - dx0, dh = Math.ceil(Math.max(...cs.map(c => c[1]))) - dy0;
  if (dw <= 0 || dh <= 0 || dw > 8000 || dh > 8000) return path;
  const g = scratch(dw, dh);
  g.setTransform(m.a, m.b, m.c, m.d, m.e - dx0, m.f - dy0);
  // 1. base: the form in its light, then half-tone and shadow as the form shifted away from the light
  const base = v => tn[clamp(v + (b > 0 ? 1 : b < -.5 ? -1 : 0), 0, 2)];
  g.fillStyle = css(base(2)); g.fill(path);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = css(base(1)); g.fill(shift(d1), 'nonzero');
  g.fillStyle = css(base(0)); g.fill(shift(d2), 'nonzero');
  // 2. strokes, value by the same test at a jittered point (soft-blended terminator), folds push the value
  const sp = sz * .62, seed = f.seed || 1, list = [];
  let row = 0;
  for (let y = y0 - sz * .3; y < y1 + sz * .3; y += sp * .62, row++) {
    let col = 0;
    for (let x = x0 - sz * .3 - (row & 1) * sp * .5; x < x1 + sz * .3; x += sp * 1.1, col++) {
      const s = seed * 1000 + row * 7919.1 + col * 104.73;
      const px = x + (H(s, 1) - .5) * sp, py = y + (H(s, 2) - .5) * sp * .7;
      if (inP(path, px, py)) list.push([px, py, s]);
    }
  }
  list.sort((a, c) => H(a[2], 9) - H(c[2], 9));
  const soft = f.soft ?? Math.min(d1 * .5, sz * .5);
  for (const [px, py, s] of list) {
    const jx = px + (H(s, 11) - .5) * soft * 2, jy = py + (H(s, 12) - .5) * soft * 2;
    let v = (!inS(jx + L[0] * d1, jy + L[1] * d1) ? 1 : 0) + (!inS(jx + L[0] * d2, jy + L[1] * d2) ? 1 : 0);
    if (f.fold) v += f.fold(jx, jy);
    v = clamp(Math.round(v + (b > 0 ? 1 : b < -.5 ? -1 : 0)), 0, 2);
    const a = (typeof f.dir === 'function' ? f.dir(px, py) : f.dir ?? 0) + R(s, 3, -.2, .2);
    const len = sz * R(s, 4, 1.5, 2.4), wid = sz * R(s, 5, .5, .72);
    stroke(g, px, py, a, len, wid, tn[v], s, { dry: f.dry ? f.dry(px, py, s) : false, alpha: f.alpha ?? .92 });
  }
  // 3. sharp warm-cream highlights on the lit edge, last
  const cpts = contour(pts, 5), n = cpts.length;
  if (f.rim) {
    const hiC = f.hiC || P.hi, rimT = f.rimT ?? .5;
    let orient = 0; for (let i = 0; i < n; i++) { const p = cpts[i], q = cpts[(i + 1) % n]; orient += p[0] * q[1] - q[0] * p[1]; }
    const sg = orient > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const p = cpts[i], q = cpts[(i + 1) % n], s = seed * 77 + i * 3.3;
      let nx = (q[1] - p[1]) * sg, ny = -(q[0] - p[0]) * sg; const mm = Math.hypot(nx, ny) || 1; nx /= mm; ny /= mm;   // outward
      const lit = nx * L[0] + ny * L[1];
      if (lit < rimT || H(s, 1) > (f.rimP ?? .55) * clamp((lit - rimT) * 3 + .35)) continue;
      const inset = (f.rimIn ?? .4) * sz;
      stroke(g, p[0] - nx * inset, p[1] - ny * inset, Math.atan2(q[1] - p[1], q[0] - p[0]) + R(s, 2, -.08, .08), sz * R(s, 3, 1, 2.2) * (f.rimL || 1), Math.max(.8, sz * (f.rimW ?? .24) * R(s, 4, .6, 1.2)), mix(hiC, P.cream, H(s, 5) * .4), s, { alpha: R(s, 6, .8, .97), bristle: false, bend: 0 });
    }
  }
  // stamp down
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = f.opacity ?? 1;
  ctx.drawImage(SCR, 0, 0, dw, dh, dx0, dy0, dw, dh);
  ctx.restore();
  return path;
}

// small marks painted on a form (eyes, brows, nostrils, seams): [x, y, len, wid, angle, colour]
export function marks(ctx, list, seed = 5) {
  list.forEach(([x, y, len, wid, ang, col, al], i) => stroke(ctx, x, y, ang, len, wid, col, seed + i * 9.7, { bristle: false, alpha: al ?? .9, bend: 0 }));
}
