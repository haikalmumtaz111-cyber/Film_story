// The hero's profile for the low close-up: facing left, chin raised toward the sky. Units = px at the close-up's
// first framing (head ≈ 430 tall, centre at 0,0). Authored upright, then tipped back by TILT.
import { form, ellipse, marks, xform, rotAbout } from '../engine/forms.js';
import { tones, hex, mix, mul, P, stroke, H, R } from '../engine/gouache.js';
import { C, streamer } from './hero.js';

export const TILT = .28;
const HEAD = [[10, -210], [-50, -200], [-95, -160], [-115, -110], [-120, -72], [-110, -50], [-118, -36], [-150, 0], [-167, 18], [-158, 28], [-138, 32], [-132, 42], [-138, 56], [-130, 68], [-135, 80], [-124, 92], [-121, 112], [-114, 138], [-92, 152], [-50, 150], [0, 128], [40, 92], [64, 40], [104, 6], [140, -60], [130, -150], [80, -200]];
const NECK = [[-64, 140], [-62, 230], [-84, 330], [110, 330], [92, 200], [70, 60], [10, 110]];
const HAIR = [[-102, -148], [-62, -208], [10, -222], [88, -202], [142, -150], [154, -60], [146, 24], [120, 64], [86, 46], [66, 6], [58, -40], [30, -86], [-24, -128], [-74, -148]];
const KNOT = ellipse(140, 66, 52, 42, 14, .5);
const EAR = [[26, -40], [50, -46], [64, -18], [62, 20], [46, 40], [28, 32], [22, -4]];
const SHAWL = [[-320, 520], [-300, 360], [-170, 300], [-70, 280], [60, 286], [170, 300], [300, 330], [380, 520]];
const BLOUSE = [[-130, 520], [-120, 330], [-90, 296], [-40, 290], [80, 292], [130, 320], [160, 520]];

export function paintHead(ctx, L, sz, seed = 1200) {
  ctx.save(); ctx.rotate(TILT);
  const Lr = [L[0] * Math.cos(-TILT) - L[1] * Math.sin(-TILT), L[0] * Math.sin(-TILT) + L[1] * Math.cos(-TILT)];
  const skin = tones(hex(C.skin), { shadow: mix(P.violet, hex('#8E4A3A'), .35), dk: .4, dd: .8 });
  form(ctx, { pts: BLOUSE, col: C.blouse, dir: Math.PI / 2, size: sz, d1: 20, d2: 70, light: Lr, seed: seed + 1, bias: -.2 });
  form(ctx, { solid: [HEAD], pts: NECK, tn: skin, dir: Math.PI / 2 + .1, size: sz * .7, d1: 22, d2: 90, light: Lr, rim: true, rimT: .35, seed: seed + 2 });
  form(ctx, { solid: [NECK], pts: HEAD, tn: skin, dir: (x, y) => Math.atan2(y + 20, x - 10) + Math.PI / 2, size: sz * .55, d1: 26, d2: 120, light: Lr, rim: true, rimT: .3, rimW: .3, seed: seed + 3, soft: 8 });
  const [dk, md, lt] = skin;
  // the jaw's shadow on the throat, the cheekbone plane, the eye, brow, nostril, lips
  marks(ctx, [
    [-40, 160, 90, 22, .1, mix(dk, md, .25), .75],
    [-96, -46, 50, 26, -.12, mix(dk, md, .35), .75],
    [-100, -45, 30, 11, -.22, mul(dk, .62)],
    [-107, -44, 12, 11, 0, hex('#2A1A16')],
    [-96, -58, 40, 6, -.28, mul(dk, .72)],
    [-111, -46, 4, 3, 0, mix(P.pale, P.hi, .5)],
    [-96, -80, 62, 10, -.16, mix(hex(C.hair), dk, .35)],
    [-148, 26, 14, 8, -.4, mul(dk, .8)],
    [-135, 56, 18, 10, .2, mix(hex('#A0402E'), md, .3)], [-131, 80, 18, 11, -.1, mix(hex('#A0402E'), lt, .25)],
    [-127, 68, 16, 3, 0, mul(dk, .7)],
  ], seed + 5);
  form(ctx, { pts: EAR, tn: skin, dir: 1.6, size: sz * .3, d1: 8, d2: 22, light: Lr, rim: true, seed: seed + 6 });
  form(ctx, { solid: [HEAD], pts: HAIR, col: C.hair, tk: { lk: .3 }, dir: (x, y) => Math.atan2(y - 40, x - 20) + Math.PI / 2, size: sz * .5, d1: 16, d2: 50, light: Lr, rim: true, rimT: .3, hiC: mix(P.hi, hex(C.hair), .2), seed: seed + 7 });
  form(ctx, { pts: KNOT, col: C.hair, tk: { lk: .3 }, dir: .8, size: sz * .4, d1: 12, d2: 30, light: Lr, rim: true, seed: seed + 8 });
  form(ctx, { pts: SHAWL, col: C.shawl, dir: (x, y) => Math.atan2(y - 600, x) + Math.PI / 2, size: sz, d1: 26, d2: 90, light: Lr, rim: true, seed: seed + 9 });
  ctx.restore();
}
// the moving parts: loose strands and the shawl's end, both streaming right
export function paintHeadCloth(ctx, L, sz, t, wind) {
  const r = rotAbout([0, 0], TILT);
  const nape = r([150, 70]);
  for (let i = 0; i < 3; i++) streamer(ctx, 'hd:hair' + i, [nape[0] + i * 6, nape[1] - 20 + i * 22], 210 - i * 45, 30 - i * 7, 3, C.hair, t, wind, 1 + i * 1.4, L, sz * .3, 20, i < 2, -.25 + i * .05);
  const sh = r([280, 340]);
  streamer(ctx, 'hd:shawl', sh, 700, 160, 300, C.shawl, t, wind, .4, L, sz, 60, true, -.18);
}
// the drop: falls into frame, splashes on the cheek, runs down
export function paintDrop(ctx, t, tHit) {
  const r = rotAbout([0, 0], TILT), hit = r([-80, 20]);
  if (t < tHit - .35) return;
  if (t < tHit) { const k = (t - (tHit - .35)) / .35, y = hit[1] - (1 - k) * 600; stroke(ctx, hit[0] - (1 - k) * 120, y, Math.PI / 2 - .2, 34, 7, mix(P.pale, P.hi, .6), 3, { bristle: false, alpha: .85 }); return; }
  const k = Math.min(1, (t - tHit) / 1.4);
  stroke(ctx, hit[0] + 4, hit[1] + k * 50, Math.PI / 2 - .1, 14 + k * 30, 8 - k * 3, mix(P.pale, P.hi, .7), 4, { bristle: false, alpha: .9 - k * .3 });
  if (t - tHit < .25) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .5, d = (t - tHit) * 220; stroke(ctx, hit[0] + Math.cos(a) * d, hit[1] + Math.sin(a) * d, a, 8, 3, P.hi, i, { bristle: false, alpha: .8 }); }
}
