// A painted figure on a 2.5D rig: bones solved per frame, every part a gouache ribbon with fixed stroke seeds.
// Units: figure height = 1 (feet at y = 0, up is −y). Angles in radians: 0 = bone hangs down, + = swings forward.
import { clamp, lerp } from '/core/lib.js';
import { ribbon, tones, stroke, css, mix, mul, P, H, R, hex } from './gouache.js';
import { form } from './forms.js';

export const POSE0 = {
  rx: 0, ry: 0, lean: .04, neck: .05, head: 0,
  shN: .15, elN: .25, shF: -.1, elF: .2,
  hipN: .05, knN: -.05, hipF: -.05, knF: -.05, ftN: 0, ftF: 0,
};
export const lerpPose = (a, b, k) => { const o = {}; for (const key in a) o[key] = lerp(a[key], b[key] ?? a[key], k); return o; };
// blend through a list of keyed poses [[t, pose], …] with smoothstep between keys
export function posed(keys, t) {
  if (t <= keys[0][0]) return { ...POSE0, ...keys[0][1] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i], [t1, p1] = keys[i + 1];
    if (t <= t1) { let k = clamp((t - t0) / (t1 - t0)); k = k * k * (3 - 2 * k); return lerpPose({ ...POSE0, ...p0 }, { ...POSE0, ...p1 }, k); }
  }
  return { ...POSE0, ...keys[keys.length - 1][1] };
}

// solve joints in figure units
export function solve(p, facing = -1) {
  p = { ...POSE0, wrN: 0, wrF: 0, ...p };
  const fx = -facing;                      // facing −1 (left) → forward is −x
  const dn = a => [-fx * Math.sin(a), Math.cos(a)];
  const up = a => [-fx * Math.sin(a), -Math.cos(a)];
  const add = (a, d, l) => [a[0] + d[0] * l, a[1] + d[1] * l];
  const J = {};
  J.pel = [p.rx, -.5 + p.ry];
  J.nb = add(J.pel, up(p.lean), .31);
  J.chest = add(J.pel, up(p.lean), .2);
  J.hc = add(J.nb, up(p.lean + p.neck), .1);
  J.htop = add(J.hc, up(p.lean + p.neck + p.head), .068);
  J.chin = add(J.hc, dn(p.lean + p.neck + p.head), .062);
  const side = [Math.cos(p.lean) * fx, Math.sin(p.lean) * fx * -1];     // toward the back, across the body
  J.shN = add(add(J.nb, up(p.lean), -.022), side, .042);
  J.shF = add(add(J.nb, up(p.lean), -.022), side, -.028);
  J.hipN = add(J.pel, side, .03); J.hipF = add(J.pel, side, -.022);
  for (const s of ['N', 'F']) {
    J['el' + s] = add(J['sh' + s], dn(p['sh' + s]), .165);
    J['wr' + s] = add(J['el' + s], dn(p['sh' + s] + p['el' + s]), .15);
    J['hd' + s] = add(J['wr' + s], dn(p['sh' + s] + p['el' + s] + (p['wr' + s] || 0)), .06);
    J['kn' + s] = add(J['hip' + s], dn(p['hip' + s]), .245);
    J['an' + s] = add(J['kn' + s], dn(p['hip' + s] + p['kn' + s]), .235);
    J['to' + s] = add(J['an' + s], dn(p['hip' + s] + p['kn' + s] + Math.PI / 2 + (p['ft' + s] || 0)), .075);
  }
  J.fx = fx; J.p = p;
  return J;
}

// quadratic spine through three points (passes through the middle one)
const thru = (a, b, c) => u => {
  const m = [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2], v = 1 - u;
  return [v * v * a[0] + 2 * u * v * m[0] + u * u * c[0], v * v * a[1] + 2 * u * v * m[1] + u * u * c[1]];
};
const line = (a, b) => u => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

export const COSTUMES = {
  hero: { skin: '#C98A5E', hair: '#3E2418', blouse: '#E8D7B4', vest: '#8F4A2A', skirt: '#7A4430', shawl: '#B8472C', boots: '#4B2D22' },
  reaper: { skin: '#B97E55', hair: '#4A2E20', blouse: '#D9C6A0', trousers: '#8A5A36', hat: '#D6A75E', boots: '#4B2D22' },
  reaper2: { skin: '#B07450', hair: '#2F1E16', blouse: '#9C6B4A', trousers: '#5F4A5E', hat: '#C99A52', boots: '#3C2620' },
  woman2: { skin: '#BE8058', hair: '#3A2219', blouse: '#CDB792', skirt: '#6F5C7E', scarf: '#A85E35', boots: '#3C2620' },
};

// draw one figure. o: {x, y, s (px per unit), id, light, size, t, wind, facing, costume, loose, hold, haze}
export function figure(ctx, pose, o) {
  const J = solve(pose, o.facing ?? -1), s = o.s, fx = J.fx;
  const W = p => [o.x + p[0] * s, o.y + p[1] * s];
  const c = typeof o.costume === 'string' ? COSTUMES[o.costume] : o.costume;
  const haze = o.haze || 0, hc = o.hazeC || P.pale;
  const T = (col, k = {}) => tones(mix(hex(col), hc, haze), k);
  const L = o.light, sz = o.size, id = o.id, t = o.t || 0;
  const wind = o.wind ?? 1, wdir = o.wdir ?? 1;      // cloth streams toward +x (wind from the left)
  const rib = (part, spine, width, col, extra = {}) =>
    ribbon(ctx, id + ':' + part, u => W(spine(u)), u => width(u) * s, { light: L, tn: T(col, extra.tk), size: sz * (extra.k || 1), rim: !o.loose && extra.rim !== false, dryEdge: o.loose ? .55 : extra.dryEdge, samples: extra.n || 12, ...extra });
  const skin = c.skin, top = c.blouse;
  const wob = (k, ph) => Math.sin(t * k + ph);

  // --- cloth streaming in the wind: a flag-like band that widens, twists and frays at the end
  const streamer = (part, from, len, w0, w1, col, ph, amp = .05, k = {}) => {
    const sp = u => {
      const a = u * len;
      const wave = (Math.sin(u * 5.2 - t * 8.5 * wind + ph) * amp + Math.sin(u * 11 - t * 14 * wind + ph * 2) * amp * .3) * u * wind;
      const droop = (1 - wind) * u * u * .3;
      return [from[0] + wdir * a * (.5 + .5 * wind), from[1] + a * (.25 - .27 * wind) + wave + droop];
    };
    const twist = u => Math.cos(u * 4.2 - t * 7 * wind + ph);
    rib(part, sp, u => lerp(w0, w1, Math.pow(u, .7)) * (.35 + .65 * Math.abs(twist(u))), col, {
      fold: (u, v) => (twist(u) < 0 ? -.55 : 0) + Math.sin(v * 3 + u * 9 - t * 9 * wind + ph) * .3 * u, n: 26, dryEdge: .84, cap1: .15, ...k,
    });
  };
  const shawl = c.shawl && (o.cloth ?? true);
  if (shawl) streamer('shawl1', [J.shN[0] + fx * .01, J.shN[1] + .01], o.shawlLen ?? .46, .07, .15, c.shawl, 0, .045, { rimT: .5, rimW: .22 });
  if (c.hair && o.hairStream !== false && !o.loose) for (let i = 0; i < 3; i++)
    streamer('hairS' + i, [J.hc[0] + fx * (.035 + i * .006), J.hc[1] - .02 + i * .018], .16 - i * .03, .02, .004, c.hair, 1.3 + i * 1.7, .02, { rim: false, dryEdge: .4, k: .45, n: 12 });

  // --- far side: arm and leg (in shadow)
  const leg = (sd, col, far) => rib('leg' + sd, thru(J['hip' + sd], J['kn' + sd], J['an' + sd]), u => (u < .5 ? lerp(.09, .064, u * 2) : lerp(.064, .05, (u - .5) * 2)) + Math.sin(u * Math.PI * 2) * .006, col, { bias: far ? -.35 : 0, n: 14 });
  const foot = (sd, far) => rib('foot' + sd, line([J['an' + sd][0], J['an' + sd][1] - .01], J['to' + sd]), u => lerp(.056, .036, u), c.boots, { bias: far ? -.3 : 0, rim: false, cap1: .9 });
  const arm = (sd, far) => {
    rib('arm' + sd, thru(J['sh' + sd], J['el' + sd], J['wr' + sd]), u => (u < .45 ? lerp(.074, .062, u / .45) : lerp(.062, .046, (u - .45) / .55)), top, { bias: far ? -.38 : 0, fold: (u) => Math.sin(u * 13) * .14, n: 14, cap0: .6 });
    rib('hand' + sd, line(J['wr' + sd], J['hd' + sd]), u => lerp(.042, .036, u) * (1 - u * u * .45), skin, { bias: far ? -.3 : 0, k: .45, cap1: .95, rim: !far });
  };
  if (o.hold === 'scythe') scythe(ctx, J, W, o, T);
  arm('F', true);
  const legC = c.trousers || c.boots;
  leg('F', legC, true); foot('F', true);
  leg('N', legC, false); foot('N', false);

  // --- torso: broad shoulders, waist, hips (3/4 view)
  const torsoSp = thru([J.nb[0], J.nb[1] + .012], J.chest, J.pel);
  const tw = u => (u < .55 ? lerp(.175, .128, Math.pow(u / .55, 1.3)) : lerp(.128, .15, (u - .55) / .45));
  rib('torso', torsoSp, tw, top, { fold: (u, v) => Math.sin(v * 4 + u * 5) * .12, cap0: .2, cap1: .2, n: 14 });
  if (c.vest) rib('vest', u => torsoSp(.25 + u * .7), u => tw(.25 + u * .7) * .82, c.vest, { cap0: .1, cap1: .1, rimT: .55, n: 10 });
  // skirt: from the waist, flaring, pressed against the legs on the wind side, flying on the other
  if (c.skirt) {
    const waist = torsoSp(.8);
    const hem = [lerp(J.knN[0], J.knF[0], .5), Math.max(lerp(J.knN[1], J.knF[1], .5) + .13, -.09)];
    const blow = wdir * .07 * wind + Math.sin(t * 6.3) * .012 * wind;
    rib('skirt', u => [lerp(waist[0], hem[0], u) + blow * u * u, lerp(waist[1], hem[1], u) - Math.abs(blow) * u * u * .3],
      u => lerp(.15, .3, Math.pow(u, .75)) * (1 + Math.sin(u * 6 - t * 8 * wind) * .04 * u), c.skirt,
      { fold: (u, v) => Math.sin(v * 6.5 + u * 2 - t * 6 * wind) * .5 * u, cap0: .1, cap1: .12, dryEdge: .92, n: 12, k: 1.1 });
  }
  if (c.trousers && c.belt !== false) rib('belt', u => torsoSp(.86 + u * .05), u => .15, c.boots, { rim: false, k: .5, n: 4, cap0: .1, cap1: .1 });
  // neck, head
  rib('neck', line([J.nb[0], J.nb[1] + .01], [lerp(J.nb[0], J.hc[0], .75), lerp(J.nb[1], J.hc[1], .75)]), () => .052, skin, { bias: -.15, rim: false, k: .45 });
  head(ctx, J, W, o, c, T);
  if (c.hat) hat(ctx, J, W, o, c, T);
  if (shawl) {   // the shawl wrapped over the shoulders, knotted at the chest
    rib('wrap', thru([J.shF[0] - fx * .015, J.shF[1] + .03], [lerp(J.nb[0], J.chest[0], .55) - fx * .01, lerp(J.nb[1], J.chest[1], .55) + .025], [J.shN[0] + fx * .03, J.shN[1] + .015]), u => .085 - Math.sin(u * Math.PI) * .018, c.shawl, { k: .8, fold: u => Math.sin(u * 9) * .3, n: 12 });
  }
  if (c.scarf) streamer('scarf', [J.hc[0] + fx * .03, J.hc[1] + .03], .2, .04, .06, c.scarf, 2, .02, { k: .7 });
  // near arm in front
  arm('N', false);
  if (o.hold === 'sheaf') sheafHeld(ctx, J, W, o, T);
  return { J, W };
}

function head(ctx, J, W, o, c, T) {
  const s = o.s, fx = J.fx, sz = o.size, L = o.light, id = o.id;
  const ax = [(J.htop[0] - J.chin[0]), (J.htop[1] - J.chin[1])], al = Math.hypot(ax[0], ax[1]); ax[0] /= al; ax[1] /= al;
  let cr = [-ax[1], ax[0]]; if (Math.sign(cr[0]) !== Math.sign(-fx)) cr = [ax[1], -ax[0]];   // across, toward the face
  const at = (a, b) => W([J.hc[0] + cr[0] * a + ax[0] * b, J.hc[1] + cr[1] * a + ax[1] * b]);
  const ha = Math.atan2(ax[1], ax[0]), across = Math.atan2(cr[1], cr[0]);
  // jaw and skull: egg from chin to crown, slightly forward at the jaw
  ribbon(ctx, id + ':head', u => { const p = [lerp(J.chin[0], J.htop[0], u) + cr[0] * .012 * (1 - u), lerp(J.chin[1], J.htop[1], u) + cr[1] * .012 * (1 - u)]; return W(p); },
    u => (.104 * Math.pow(Math.sin(Math.PI * (u * .9 + .06)), .5)) * s,
    { light: L, tn: T(c.skin), size: sz * .4, rim: !o.loose, rimT: .5, cap0: .45, cap1: .55, samples: 12, dir: 'across' });
  if (o.loose && s < 160) {     // distant figures: a dab of hair and done
    ribbon(ctx, id + ':hairD', u => at(-.02 + u * .01, .005 + u * .06), u => .09 * s * Math.sin(Math.PI * (u * .8 + .1)), { light: L, tn: T(c.hair), size: sz * .5, samples: 6, dryEdge: .6 });
    return;
  }
  const [dk, md, lt] = T(c.skin);
  const f = (a, b, len, wid, col, ang, sd, al = .9) => { const [x, y] = at(a, b); stroke(ctx, x, y, ang, len * s, Math.max(1, wid * s), col, sd, { bristle: false, alpha: al, bend: 0 }); };
  // planes: the front of the face turns away from the light, the cheek and temple take it
  f(.05, -.005, .07, .03, mix(dk, md, .45), ha, 11, .75);
  f(-.005, -.012, .06, .03, lt, ha, 9, .85);
  f(.0, .03, .04, .02, lt, ha + .1, 10, .8);
  // eye sockets, eyes, brows, nose, mouth
  f(.055, .012, .022, .011, dk, across, 3);
  f(.012, .014, .026, .012, dk, across, 4);
  f(.056, .03, .026, .007, mul(dk, .8), across - .25, 5);
  f(.014, .032, .034, .008, mul(dk, .8), across + .15, 6);
  f(.07, -.004, .03, .011, dk, ha + .25, 7);
  f(.072, -.012, .012, .01, lt, across, 12);
  f(.045, -.04, .03, .009, mix(dk, hex('#8E3A2A'), .5), across, 8);
  f(-.035, .0, .028, .02, mix(dk, md, .4), ha, 13);   // ear
  // hair: the mass over the crown and the back of the head, tied
  ribbon(ctx, id + ':hair', u => { const a = Math.PI * (1.08 - u * .78); return at(-.008 + Math.cos(a) * .058, .012 + Math.sin(a) * .06); },
    u => .052 * s * Math.pow(Math.sin(Math.PI * (u * .8 + .12)), .5) * (1 - u * .45),
    { light: L, tn: T(c.hair, { lk: .3 }), size: sz * .45, rim: true, rimT: .5, rimP: .6, hiC: mix(P.hi, hex(c.hair), .35), samples: 12, fold: u => Math.sin(u * 12) * .2 });
  ribbon(ctx, id + ':knot', u => at(-.06 - u * .035, .0 + u * .015), u => .05 * s * Math.sin(Math.PI * (u * .8 + .1)), { light: L, tn: T(c.hair, { lk: .3 }), size: sz * .4, rim: true, samples: 6 });
}

function hat(ctx, J, W, o, c, T) {
  const ha = Math.atan2(J.htop[1] - J.chin[1], J.htop[0] - J.chin[0]);
  const cx = J.htop[0] + Math.cos(ha) * -.012, cy = J.htop[1] + Math.sin(ha) * -.012;
  const ax = Math.cos(ha + Math.PI / 2), ay = Math.sin(ha + Math.PI / 2);
  ribbon(ctx, o.id + ':brim', u => W([cx + ax * (u - .5) * .21, cy + ay * (u - .5) * .21]), u => .022 * o.s, { light: o.light, tn: T(c.hat), size: o.size * .5, rim: !o.loose, samples: 8, dryEdge: o.loose ? .3 : 0 });
  ribbon(ctx, o.id + ':crown', u => W([cx + Math.cos(ha) * u * .05, cy + Math.sin(ha) * u * .05]), u => (.1 - u * .02) * o.s, { light: o.light, tn: T(c.hat), size: o.size * .5, rim: !o.loose, samples: 6, cap1: .7 });
}

// scythe: snath through both hands, blade at the low end
function scythe(ctx, J, W, o, T) {
  const a = J.hdF, b = J.hdN, dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
  const ux = dx / m, uy = dy / m;
  const top = [b[0] + ux * .18, b[1] + uy * .18], low = [a[0] - ux * .5, a[1] - uy * .5];
  ribbon(ctx, o.id + ':snath', u => W([lerp(top[0], low[0], u), lerp(top[1], low[1], u)]), () => .016 * o.s, { light: o.light, tn: T('#7A5232'), size: o.size * .4, rim: !o.loose, samples: 6 });
  const bl = J.fx * -1;   // blade curls forward
  ribbon(ctx, o.id + ':blade', u => { const ang = Math.atan2(uy, ux) + Math.PI + bl * (1.4 + u * .9); const r = .34; return W([low[0] + Math.cos(ang) * r * u * 1.0, low[1] + Math.sin(ang) * r * u * .55 + u * .02]); },
    u => (.034 * (1 - u * .85)) * o.s, { light: o.light, tn: T('#7E8796', { lk: .6 }), size: o.size * .4, rim: true, rimT: .3, rimP: 1, samples: 10, cap1: .9 });
}

// a sheaf of wheat held up between both palms
export function sheafHeld(ctx, J, W, o, T) {
  const a = J.hdF, b = J.hdN, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ang = o.sheafAng ?? (Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
  sheaf(ctx, o.id + ':sheaf', W(m), ang, .42 * o.s, o.light, o.size * .7, T, o.t);
}

// sheaf: a bundle of stalks tied at the waist, the ears a ragged golden fan. c = centre px, ang = toward the ears
export function sheaf(ctx, id, c, ang, len, L, size, T = (x, k) => tones(hex(x), k), t = 0) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const at = (u, v) => [c[0] + ca * u * len - sa * v * len, c[1] + sa * u * len + ca * v * len];
  const sd = [...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0) & 0xffff, 3);
  const quiver = Math.sin(t * 8 + sd) * .012;
  // stalks: flared cut ends, waisted at the band
  const stalk = [[-.5, -.12], [-.2, -.075], [.05, -.06], [.12, -.075], [.12, .075], [.05, .06], [-.2, .075], [-.5, .12], [-.52, 0]].map(([u, v]) => at(u, v));
  form(ctx, { pts: stalk, tn: T('#C99A50'), dir: ang, size: size * .7, d1: len * .03, d2: len * .09, light: L, rim: true, seed: sd, alpha: .95 });
  // ears: a jagged fan
  const ears = [];
  const N = 13;
  for (let i = 0; i <= N; i++) { const k = i / N, a = (k - .5) * 1.25, r = .44 + (i % 2 ? .06 : -.02) + Math.sin(i * 2.3 + sd) * .03; ears.push([.06 + Math.cos(a) * r, Math.sin(a) * r * .75 + quiver * k]); }
  ears.push([.12, .07], [.12, -.07]);
  form(ctx, { pts: ears.map(([u, v]) => at(u, v)), tn: T('#E2B562'), dir: (x, y) => Math.atan2(y - c[1], x - c[0]), size: size * .6, d1: len * .05, d2: len * .16, light: L, rim: true, rimT: .3, seed: sd + 1, dry: (x, y, s) => H(s, 3) < .3, alpha: .95 });
  // single ears flicking out of the fan
  const tn = T('#E8C070');
  for (let i = 0; i < 22; i++) {
    const s = sd + i * 13.7, a = (H(s, 0) - .5) * 1.3, r = R(s, 1, .38, .55);
    const p = at(.06 + Math.cos(a) * r, Math.sin(a) * r * .75 + quiver), d = ang + a * .8;
    const lit = Math.cos(d - Math.atan2(L[1], L[0]));
    stroke(ctx, p[0], p[1], d, size * R(s, 3, 1.1, 1.8), size * .38, tn[lit > .2 ? 2 : 1], s, { dry: H(s, 4) < .5, alpha: .95 });
  }
  // the band
  form(ctx, { pts: [[.0, -.08], [.07, -.08], [.07, .08], [.0, .08]].map(([u, v]) => at(u, v)), tn: T('#7A4A28'), dir: ang + Math.PI / 2, size: size * .35, d1: len * .02, d2: len * .05, light: L, seed: sd + 2, rim: true });
}
