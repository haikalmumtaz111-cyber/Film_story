// The world: sky, storm wall, sun, wheat steppe, wagon. Painted once per shot into cached plates (frame units, 1920 wide).
import { stroke, region, clouds, tones, hex, mix, mul, css, P, H, R, cached } from '../engine/gouache.js';
import { form, ellipse, limb } from '../engine/forms.js';
import { sheaf } from '../engine/figure.js';
import { clamp, lerp, ss, vnoise } from '/core/lib.js';

// sky colour: cobalt overhead → pale blue → cream around a low sun; the storm side darkens toward violet-cobalt
export function skyColor(x, y, o) {
  const hz = o.hz, k = clamp(1 - (hz - y) / (hz * .95));            // 0 at top, 1 at the horizon
  let c = mix(P.cobalt, P.pale, Math.pow(k, 1.35));
  const ds = Math.hypot((x - o.sun[0]) / 1.3, y - o.sun[1]) / (o.glow || 520);
  c = mix(c, P.cream, clamp(1 - ds) ** 1.6 * .95);
  c = mix(c, hex('#F7D8A0'), clamp(1 - ds * 2.2) * .6);
  if (o.storm) { const s = clamp(o.storm(x, y)); c = mix(c, mix(hex('#24396F'), P.violet, .25), s * .85); }
  return c;
}
export function paintSky(ctx, o) {
  const [x0, y0, x1, y1] = o.box;
  const g = ctx.createLinearGradient(0, y0, 0, o.hz);
  g.addColorStop(0, css(P.cobalt)); g.addColorStop(1, css(P.pale));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // underlayer: the sky's own colour field, coarse
  for (let y = y0; y < y1; y += 24) for (let x = x0; x < x1; x += 24) { ctx.fillStyle = css(skyColor(x + 12, y + 12, o)); ctx.fillRect(x, y, 25, 25); }
  // strokes: broad, nearly horizontal, curving around the sun; three values snapped per stroke
  region(ctx, o.box, {
    seed: o.seed || 3, spacing: .66,
    sizeAt: (x, y) => o.size * (.85 + .3 * (1 - y / o.hz)),
    test: (x, y) => y < o.hz + 10,
    colorAt: (x, y, s) => { const c = skyColor(x, y, o); return mul(c, 1 + (H(s, 7) - .5) * .07); },
    dirAt: (x, y) => { const dx = x - o.sun[0], dy = y - o.sun[1], d = Math.hypot(dx, dy); const flat = .03 + Math.sin(x * .002 + y * .004) * .06; return d < 160 ? Math.atan2(dy, dx) + Math.PI / 2 : flat; },
    ax: 1.6, ay: .48, jit: .6, lenMul: 1.25,
  });
}

// the sun: a hot cream disc, half-veiled, with a soft halo of short radial strokes
export function paintSun(ctx, x, y, r, veil = 0) {
  const g = ctx.createRadialGradient(x, y, r * .2, x, y, r * 4);
  g.addColorStop(0, 'rgba(255,240,205,.9)'); g.addColorStop(.3, 'rgba(250,218,160,.35)'); g.addColorStop(1, 'rgba(244,224,182,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 70; i++) { const s = i * 7.7 + 1, a = H(s, 1) * Math.PI * 2, d = r * R(s, 2, .1, .9); stroke(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, a + Math.PI / 2, r * .5, r * .22, mix(hex('#FFF4D6'), hex('#FBE2AE'), H(s, 3)), s, { bristle: false, alpha: .95 }); }
}

// a storm wall: billows stacked along a front, lit warm on the sun side, cobalt-violet in the body
export function stormBalls(seed, x0, x1, top, base, n, rmin, rmax) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = seed + i * 3.7, x = lerp(x0, x1, H(s, 1)), k = (x - x0) / (x1 - x0);
    const yTop = lerp(top[0], top[1], k), r = R(s, 2, rmin, rmax) * (1 - k * .35);
    const y = lerp(yTop + r * .6, base - r * .5, Math.pow(H(s, 3), 1.4));
    out.push([x, y, r]);
  }
  return out.sort((a, b) => a[1] - b[1]);
}
export function paintStorm(ctx, balls, o) {
  const tn = [mix(hex('#1C2452'), P.violet, .35), mix(P.cobalt, P.violet, .32), mix(hex('#E6C49A'), P.violet, .12)];
  clouds(ctx, balls, { tn, light: o.light, size: o.size, seed: o.seed || 9, rim: P.hi, bias: o.bias ?? 0, lo: -.05, hi: .42 });
}

// the steppe: wheat from the horizon to the lens. Distance shrinks the strokes and pulls colour toward violet haze.
export function fieldColor(x, y, o, s = 0) {
  const d = clamp((y - o.hz) / (o.H - o.hz));                       // 0 at horizon, 1 at the bottom
  let base = mix(hex('#E9B86C'), P.ground, ss(d * 2));
  base = mix(base, hex('#D59A4E'), clamp((d - .55) * 1.6) * .8);        // warmer, deeper ochre near
  // rows and wind waves
  const wave = Math.sin(x * .004 + y * .012 - (o.ph || 0)) * .5 + vnoise(x * .006 + y * .02) * .5;
  let v = wave > .62 ? 2 : wave < .28 ? 0 : 1;
  if (o.shadow && o.shadow(x, y)) v = Math.max(0, v - 2);               // a cloud shadow crossing the field
  const tn = tones(base, { lk: .45, dk: .32, dd: .86 });
  let c = tn[v];
  const haze = Math.pow(1 - d, 6);
  c = mix(c, mix(P.violet, P.pale, .45), haze * .75);
  return c;
}
export function paintField(ctx, o) {
  const [x0, , x1] = o.box, hz = o.hz, Hh = o.H;
  ctx.fillStyle = css(P.ground); ctx.fillRect(x0, hz, x1 - x0, Hh - hz + 40);
  for (let y = hz; y < Hh + 40; y += 12) for (let x = x0; x < x1; x += 30) { ctx.fillStyle = css(fieldColor(x + 15, y + 6, o)); ctx.fillRect(x, y, 31, 13); }
  region(ctx, [x0, hz - 4, x1, Hh + 30], {
    seed: o.seed || 11, spacing: .6,
    sizeAt: (x, y) => lerp(4, o.size * 1.25, Math.pow(clamp((y - hz) / (Hh - hz)), 1.1)),
    test: (x, y) => y > hz - 2,
    colorAt: (x, y, s) => fieldColor(x, y, o, s),
    dirAt: (x, y) => { const d = clamp((y - hz) / (Hh - hz)); return lerp(.05, -Math.PI / 2 + .45, ss(d * 1.25)); },
    lenMul: 1.1, ax: 1.4, ay: .52,
    dry: (x, y, s) => (y - hz) / (Hh - hz) > .55 && H(s, 31) < .35,
  });
}

// distant ridge and a village on the horizon, in violet, flat as distance makes them
export function paintHorizon(ctx, o) {
  const tn = tones(mix(P.violet, P.pale, .35), { lk: .3, dk: .25 });
  const pts = [[o.box[0], o.hz + 6]];
  for (let x = o.box[0]; x <= o.box[2]; x += 60) pts.push([x, o.hz - 6 - (vnoise(x * .004 + (o.seed || 0)) * o.ridge)]);
  pts.push([o.box[2], o.hz + 6]);
  form(ctx, { pts, tn, dir: 0, size: 10, d1: 6, d2: 18, light: [.9, -.4], seed: 61, edge: false });
  for (const [x, w, h] of (o.houses || [])) {
    form(ctx, { pts: [[x, o.hz - 4], [x, o.hz - h], [x + w * .5, o.hz - h * 1.5], [x + w, o.hz - h], [x + w, o.hz - 4]], tn: tones(mix(P.violet, P.pale, .2), { lk: .35 }), dir: Math.PI / 2, size: 5, d1: 3, d2: 8, light: [.9, -.4], seed: x, sharp: [0, 1, 2, 3, 4], edge: false });
  }
}

// wheat close to the lens: tall stalks with ears, swaying with the gust. Every frame, from fixed seeds.
export function nearWheat(ctx, o, t) {
  const n = o.n || 160, L = o.light;
  for (let i = 0; i < n; i++) {
    const s = (o.seed || 5) + i * 1.913, x = lerp(o.x0, o.x1, H(s, 1)), base = o.y + R(s, 2, 0, o.depth || 60);
    const h = R(s, 3, o.h * .6, o.h);
    const gust = Math.sin(t * 2.1 - x * .004) * .5 + .5;
    const lean = .12 + (o.wind ?? 1) * (.22 + .25 * gust) + Math.sin(t * 7 + i) * .03;
    const tipx = x + Math.sin(lean) * h, tipy = base - Math.cos(lean) * h;
    const tn = tones(mix(hex('#E3B262'), hex('#C98A44'), H(s, 4)), { lk: .5 });
    // stalk
    ctx.strokeStyle = css(tn[H(s, 5) < .5 ? 0 : 1]); ctx.lineWidth = Math.max(1.2, h * .012); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + Math.sin(lean) * h * .3, base - h * .55, tipx, tipy); ctx.stroke();
    // ear: a few overlapping dabs, lit on the sun side
    const ang = -Math.PI / 2 + lean;
    for (let j = 0; j < 4; j++) {
      const k = j / 4, ex = tipx - Math.cos(ang) * h * .1 * k, ey = tipy - Math.sin(ang) * h * .1 * k;
      stroke(ctx, ex, ey, ang, h * .06, h * .028, tn[j === 0 ? 2 : H(s, 6 + j) < .55 ? 2 : 1], s + j, { bristle: false, alpha: .95 });
    }
    if (H(s, 9) < .5) stroke(ctx, tipx + 2, tipy - 2, ang + .3, h * .05, Math.max(1, h * .006), P.hi, s + 9, { bristle: false, alpha: .8, bend: 0 });
  }
}

// chaff and dust in the wind: dry-brush flecks drifting across, world-anchored with a wrap
export function chaff(ctx, o, t) {
  for (let i = 0; i < (o.n || 60); i++) {
    const s = (o.seed || 77) + i * 2.3, sp = R(s, 1, .6, 1.4) * (o.speed || 260);
    const x = o.x0 + ((H(s, 2) * (o.x1 - o.x0) + t * sp) % (o.x1 - o.x0));
    const y = lerp(o.y0, o.y1, H(s, 3)) + Math.sin(t * 3 + i) * 12;
    stroke(ctx, x, y, .08 + Math.sin(t * 5 + i) * .2, R(s, 4, 8, 22) * (o.k || 1), R(s, 5, 2, 5) * (o.k || 1), mix(hex('#F2D59A'), P.hi, H(s, 6)), s, { dry: true, alpha: R(s, 7, .4, .8) });
  }
}

// rain: dry-brush streaks slanting with the wind
export function rain(ctx, o, t, amt) {
  const n = Math.round((o.n || 220) * amt);
  for (let i = 0; i < n; i++) {
    const s = (o.seed || 31) + i * 1.37, sp = R(s, 1, 1400, 1900);
    const y = o.y0 + ((H(s, 2) * (o.y1 - o.y0) + t * sp) % (o.y1 - o.y0));
    const x = o.x0 + H(s, 3) * (o.x1 - o.x0) + (y - o.y0) * .35;
    stroke(ctx, x, y, Math.PI / 2 - .33, R(s, 4, 30, 70), R(s, 5, 1.5, 3), mix(hex('#C9D6E2'), P.cream, H(s, 6) * .5), s, { dry: true, alpha: R(s, 7, .25, .55) });
  }
}

// the hay wagon: box, wheels, a heap of sheaves. Units: wagon length ~ 1000, wheels on y = 0.
export function paintWagon(ctx, L, sz, heapH = 1, seed = 900) {
  const wood = '#7A4E2E';
  // far wheels (shadow)
  for (const x of [-330, 300]) wheel(ctx, x + 40, -10, 150, L, sz, seed + x, -.6);
  // box
  form(ctx, { pts: [[-470, -190], [470, -190], [450, -100], [-450, -100]], col: wood, dir: 0, size: sz * .7, d1: 12, d2: 40, light: L, rim: true, seed: seed + 1, sharp: [0, 1, 2, 3] });
  for (let i = 0; i < 4; i++) form(ctx, { pts: [[-460, -186 + i * 22], [460, -186 + i * 22], [458, -178 + i * 22], [-458, -178 + i * 22]], col: '#5C3A24', dir: 0, size: sz * .35, d1: 3, d2: 6, light: L, seed: seed + 2 + i, edge: false });
  // shafts
  form(ctx, { pts: limb([[-470, -120], [-760, -60]], [26, 18]), col: wood, dir: .2, size: sz * .4, d1: 6, d2: 16, light: L, rim: true, seed: seed + 8 });
  // the heap: sheaf ears peeking over the crown (behind), one golden mound, a few sheaves lying across its face
  const k = heapH, mound = [[-470, -186], [-440, -280], [-330, -380 * k], [-150, -450 * k], [60, -470 * k], [240, -420 * k], [390, -310 * k], [470, -186]];
  const tnS = (x, kk) => tones(hex(x), kk);
  for (let i = 0; i < 9; i++) {
    const u = (i + .5) / 9, a = Math.PI * (1.08 + u * .84), s = seed + i * 7.3;
    const x = Math.cos(a) * 330, y = -186 + Math.sin(a) * 250 * k;
    sheaf(ctx, 'wg' + i, [x, y], a + R(s, 3, -.2, .2), 220, L, sz * .45, tnS, 0);
  }
  form(ctx, { pts: mound, col: '#D8A656', dir: (x, y) => Math.atan2(y + 60, x * .8), size: sz * .8, d1: 40, d2: 130, light: L, rim: true, rimT: .3, seed: seed + 20, dry: (x, y, s) => H(s, 4) < .25 });
  for (let i = 0; i < 7; i++) {
    const s = seed + 100 + i * 5.1, x = R(s, 1, -300, 300), y = R(s, 2, -240, -380 * k + 80);
    sheaf(ctx, 'wf' + i, [x, y], (x < 0 ? Math.PI : 0) + R(s, 3, -.35, .35), 190, L, sz * .45, tnS, 0);
  }
  // near wheels
  for (const x of [-360, 330]) wheel(ctx, x, 0, 160, L, sz, seed + 50 + x, 0);
}
function wheel(ctx, x, y, r, L, sz, seed, bias) {
  const tn = tones(hex('#6E4529'), {});
  form(ctx, { pts: ellipse(x, y - r, r * .32, r, 24), tn, dir: Math.PI / 2, size: sz * .4, d1: 10, d2: 30, light: L, rim: bias === 0, seed, bias });
  form(ctx, { pts: ellipse(x + 6, y - r, r * .22, r * .84, 20), tn: tones(mix(hex('#6E4529'), P.violet, .3)), dir: Math.PI / 2, size: sz * .3, d1: 6, d2: 20, light: L, seed: seed + 1, bias: -.6, edge: false });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; form(ctx, { pts: limb([[x + 6, y - r], [x + 6 + Math.cos(a) * r * .21, y - r + Math.sin(a) * r * .8]], [12, 9]), tn, dir: a, size: sz * .25, d1: 3, d2: 8, light: L, seed: seed + 2 + i, bias, edge: false }); }
  form(ctx, { pts: ellipse(x + 6, y - r, r * .07, r * .12, 10), tn, dir: 0, size: sz * .2, d1: 3, d2: 8, light: L, seed: seed + 9, rim: true });
}
