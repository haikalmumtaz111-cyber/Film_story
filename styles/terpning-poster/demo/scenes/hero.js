// The hero, drawn as contours (height 1000 units, soles at y = 1000, x = 0 under the body), then painted.
// Three drawings: POINT (facing left, the diagonal gesture), LIFT (facing right, the sheaf raised), and the profile head (head.js).
// Static parts are painted once into a cache; cloth, hair and the gesturing arm are painted every frame from fixed seeds.
import { form, limb, xform, rotAbout, ellipse, marks, smooth } from '../engine/forms.js';
import { ribbon, tones, hex, mix, mul, P, css, cached, H, R } from '../engine/gouache.js';
import { sheaf } from '../engine/figure.js';
import { lerp, clamp } from '/core/lib.js';

export const C = {
  skin: '#C98A5E', hair: '#3A2216', blouse: '#E6D3AE', vest: '#8A4528', skirt: '#74402E', shawl: '#B5452B', boot: '#4A2C22',
};
const T = (c, k) => tones(hex(c), k);

// ---------- POINT: facing left, leaning into the wind, far arm raised toward the field ----------
const HEAD_L = [[-6, 0], [30, 6], [52, 26], [58, 58], [50, 88], [34, 106], [16, 120], [-12, 131], [-38, 128], [-50, 118], [-53, 106], [-58, 98], [-60, 90], [-71, 81], [-64, 66], [-59, 50], [-58, 32], [-46, 10], [-26, 2]];
const HAIR_L = [[-54, 28], [-46, 6], [-16, -8], [22, -5], [52, 14], [66, 44], [66, 78], [56, 100], [38, 94], [26, 72], [10, 48], [-18, 32], [-40, 36]];
const NECK = [[-34, 108], [-22, 150], [-40, 178], [30, 178], [32, 140], [28, 100]];
const TORSO = [[-34, 160], [-60, 170], [-68, 205], [-64, 255], [-72, 292], [-58, 335], [-50, 380], [-56, 412], [60, 412], [52, 380], [62, 322], [78, 252], [88, 202], [74, 172], [24, 160]];
const VEST = [[-60, 262], [-70, 294], [-57, 335], [-49, 380], [-55, 414], [59, 414], [51, 380], [60, 322], [70, 262], [36, 250], [-10, 246]];
const WRAP = [[-64, 172], [-30, 158], [30, 157], [84, 168], [100, 210], [94, 286], [74, 356], [44, 300], [6, 266], [-36, 262], [-64, 246], [-74, 206]];
const KNOT = [[-58, 168], [-38, 166], [-30, 186], [-40, 204], [-56, 206], [-66, 190]];
const SKIRT = [[-58, 404], [58, 404], [92, 480], [140, 580], [186, 700], [222, 818], [206, 858], [124, 872], [40, 866], [-40, 872], [-90, 860], [-100, 820], [-86, 720], [-72, 600], [-66, 500]];
const BOOT_F = [[-96, 858], [-70, 858], [-60, 950], [-50, 982], [-22, 990], [-18, 1004], [-122, 1004], [-128, 990], [-100, 978], [-100, 940]];
const BOOT_B = [[26, 858], [52, 858], [62, 938], [80, 972], [112, 986], [104, 1000], [42, 998], [30, 972]];
// near arm hangs back, fist by the hip
const ARM_N = { sh: [64, 192], el: [96, 318], wr: [120, 428] };
// far arm (pivot at the shoulder): rest = raised toward the field
export const ARM_F = { sh: [-50, 184], el: [-150, 84], wr: [-238, -18] };
const LEAN = -.13, ROOT = [0, 1000];
const BODY = [TORSO, SKIRT, NECK];

function sleeveAndForearm(ctx, a, L, sz, seed, far) {
  const upper = limb([a.sh, a.el, [lerp(a.el[0], a.wr[0], .18), lerp(a.el[1], a.wr[1], .18)]], [62, 50, 50], { bulgeL: [6, 0], bulgeR: [3, 0] });
  const fore = limb([[lerp(a.el[0], a.wr[0], .1), lerp(a.el[1], a.wr[1], .1)], [lerp(a.el[0], a.wr[0], .45), lerp(a.el[1], a.wr[1], .45)], a.wr], [42, 40, 30], { bulgeL: [4, 0], bulgeR: [2, 0] });
  const dirU = Math.atan2(a.el[1] - a.sh[1], a.el[0] - a.sh[0]), dirF = Math.atan2(a.wr[1] - a.el[1], a.wr[0] - a.el[0]);
  form(ctx, { pts: fore, col: C.skin, dir: dirF, size: sz * .6, d1: 9, d2: 24, light: L, rim: true, seed: seed + 1, bias: far ? 0 : 0 });
  form(ctx, { pts: upper, col: C.blouse, dir: dirU + Math.PI / 2, size: sz * .8, d1: 12, d2: 34, light: L, rim: true, seed: seed + 2 });
  // rolled cuff
  const cuff = limb([[lerp(a.el[0], a.wr[0], .05), lerp(a.el[1], a.wr[1], .05)], [lerp(a.el[0], a.wr[0], .2), lerp(a.el[1], a.wr[1], .2)]], [54, 50]);
  form(ctx, { pts: cuff, col: C.blouse, dir: dirF + Math.PI / 2, size: sz * .5, d1: 8, d2: 20, light: L, rim: true, seed: seed + 3 });
  return dirF;
}

// open hand, fingers together, leading the point; thumb tucked along the top
function pointingHand(ctx, wr, dir, L, sz, seed) {
  const r = rotAbout([0, 0], dir), at = p => { const q = r(p); return [wr[0] + q[0], wr[1] + q[1]]; };
  const hand = xform([[-6, -15], [20, -17], [44, -14], [68, -10], [84, -6], [88, -1], [80, 4], [56, 8], [34, 14], [12, 17], [-6, 10]], at);
  const thumb = xform([[10, -14], [26, -24], [42, -26], [48, -20], [36, -13], [22, -9]], at);
  form(ctx, { pts: hand, col: C.skin, dir, size: sz * .32, d1: 6, d2: 15, light: L, rim: true, seed: seed + 5 });
  form(ctx, { pts: thumb, col: C.skin, dir: dir - .5, size: sz * .26, d1: 4, d2: 10, light: L, rim: true, seed: seed + 7 });
  const [dk] = T(C.skin);
  marks(ctx, [[...at([60, 2]), 24, 2.5, dir, dk, .6], [...at([58, -4]), 22, 2, dir, dk, .45]], seed + 8);
}
function fist(ctx, wr, dir, L, sz, seed) {
  const r = rotAbout([0, 0], dir), at = p => { const q = r(p); return [wr[0] + q[0], wr[1] + q[1]]; };
  form(ctx, { pts: xform([[-4, -18], [20, -22], [42, -14], [48, 4], [38, 20], [14, 22], [-4, 12]], at), col: C.skin, dir, size: sz * .36, d1: 7, d2: 18, light: L, rim: true, seed });
}

function headL(ctx, L, sz, seed, o = {}) {
  form(ctx, { solid: [HEAD_L, TORSO], pts: NECK, col: C.skin, dir: Math.PI / 2, size: sz * .5, d1: 10, d2: 26, light: L, seed: seed + 10, bias: -.2 });
  form(ctx, { pts: HEAD_L, col: C.skin, dir: (x, y) => Math.PI / 2 + (x + 10) * .01, size: sz * .36, d1: 12, d2: 40, light: L, rim: true, rimT: .4, seed: seed + 11, soft: 4 });
  const [dk, md, lt] = T(C.skin);
  marks(ctx, [
    [-44, 70, 26, 10, -1.2, mix(dk, md, .3), .7],    // shadow under the cheekbone, front plane
    [-36, 56, 26, 12, .1, mix(dk, hex(C.skin), .3), .7],   // socket
    [-35, 58, 17, 6, .12, mul(dk, .55)], [-39, 58, 6, 6, 0, hex('#24150F')], [-56, 58, 9, 5, .2, mul(dk, .6)], // eyes
    [-36, 47, 22, 5, -.12, mul(dk, .8)], [-56, 47, 10, 4, .1, mul(dk, .8)],  // brows
    [-62, 82, 10, 6, -.3, dk],                         // nostril
    [-52, 101, 16, 4, .12, mix(dk, hex('#8E3A2A'), .5)],   // mouth
    [-12, 82, 40, 8, 1.3, lt, .55], [-6, 44, 30, 7, 1.45, lt, .5],   // lit cheek, temple
    [14, 72, 14, 20, 1.5, mix(dk, md, .4), .9],        // ear
  ], seed + 12);
  form(ctx, { pts: HAIR_L, col: C.hair, dir: (x, y) => Math.atan2(y - 60, x - 0) + Math.PI / 2, size: sz * .4, d1: 10, d2: 30, light: L, rim: true, rimT: .4, hiC: mix(P.hi, hex(C.hair), .25), seed: seed + 13, tk: { lk: .3 } });
  form(ctx, { pts: ellipse(72, 84, 22, 17, 12, .3), col: C.hair, dir: .6, size: sz * .3, d1: 8, d2: 20, light: L, rim: true, seed: seed + 14, tk: { lk: .3 } });
}

// paint the static body of POINT into a context in figure units
export function paintPointBody(ctx, L, sz, seed = 100) {
  ctx.save();
  const lean = rotAbout(ROOT, LEAN), Lr = L;   // forms are authored upright; the lean is applied as a transform
  ctx.translate(ROOT[0], ROOT[1]); ctx.rotate(LEAN); ctx.translate(-ROOT[0], -ROOT[1]);
  const Ll = rotLight(L, -LEAN);
  form(ctx, { pts: BOOT_B, col: C.boot, dir: 0, size: sz * .5, d1: 8, d2: 24, light: Ll, seed: seed + 1, bias: -.6 });
  form(ctx, { pts: BOOT_F, col: C.boot, dir: 0, size: sz * .5, d1: 8, d2: 24, light: Ll, rim: true, seed: seed + 2 });
  form(ctx, { solid: [TORSO], pts: SKIRT, col: C.skirt, dir: (x, y) => Math.PI / 2 - (x - 20) * .0025 * (y - 400) / 400, size: sz, d1: 30, d2: 110, light: Ll, rim: true, seed: seed + 3,  dry: (x, y, s) => y > 840 && H(s, 3) < .6 });
  form(ctx, { solid: [SKIRT, NECK], pts: TORSO, col: C.blouse, dir: (x, y) => Math.PI / 2 + x * .004, size: sz * .8, d1: 18, d2: 60, light: Ll, rim: true, seed: seed + 4 });
  form(ctx, { solid: [TORSO, SKIRT], pts: VEST, col: C.vest, dir: Math.PI / 2, size: sz * .8, d1: 16, d2: 56, light: Ll, rim: true, seed: seed + 5 });
  // near arm
  const dirF = sleeveAndForearm(ctx, ARM_N, Ll, sz, seed + 20, false);
  fist(ctx, ARM_N.wr, dirF, Ll, sz, seed + 26);
  headL(ctx, Ll, sz, seed + 30);
  form(ctx, { solid: [TORSO, NECK], pts: WRAP, col: C.shawl, dir: (x, y) => Math.atan2(y - 300, x + 20) + Math.PI / 2, size: sz * .7, d1: 14, d2: 44, light: Ll, rim: true, seed: seed + 40 });
  form(ctx, { pts: KNOT, col: C.shawl, dir: 1, size: sz * .45, d1: 8, d2: 20, light: Ll, rim: true, seed: seed + 41 });
  ctx.restore();
}
export const rotLight = (L, a) => [L[0] * Math.cos(a) - L[1] * Math.sin(a), L[0] * Math.sin(a) + L[1] * Math.cos(a)];
export const leanPt = p => rotAbout(ROOT, LEAN)(p);

// the raised arm, rotated about the shoulder by `ang` (0 = full point); drawn every frame (cache per angle step)
export function paintPointArm(ctx, L, sz, ang, seed = 300) {
  ctx.save();
  ctx.translate(ROOT[0], ROOT[1]); ctx.rotate(LEAN); ctx.translate(-ROOT[0], -ROOT[1]);
  const sh = ARM_F.sh;
  ctx.translate(sh[0], sh[1]); ctx.rotate(ang); ctx.translate(-sh[0], -sh[1]);
  const Ll = rotLight(L, -LEAN - ang);
  const dirF = sleeveAndForearm(ctx, ARM_F, Ll, sz, seed, true);
  pointingHand(ctx, ARM_F.wr, dirF, Ll, sz, seed + 10);
  ctx.restore();
}

// cloth and hair streaming (every frame). In figure units, after the lean.
export function paintPointCloth(ctx, L, sz, t, wind = 1, seed = 500) {
  const sh = leanPt([84, 176]);
  streamer(ctx, 'pt:shawl', sh, 520, 70, 170, C.shawl, t, wind, 0, L, sz, 34);
  const nape = leanPt([66, 86]);
  for (let i = 0; i < 4; i++) streamer(ctx, 'pt:hair' + i, [nape[0] + i * 3, nape[1] + i * 7 - 8], 150 - i * 22, 16, 3, C.hair, t, wind, 1.3 + i * 1.9, L, sz * .35, 14, false);
  // the skirt's trailing edge flaps
  const hem0 = leanPt([150, 600]);
  streamer(ctx, 'pt:skirt', hem0, 110, 90, 60, C.skirt, t * .8, wind * .5, 2.2, L, sz * .8, 12, true, Math.PI / 2 - .45);
}

// a band of cloth in the wind: widens, twists (showing its darker back) and frays
export function streamer(ctx, id, from, len, w0, w1, col, t, wind, ph, L, sz, amp = 30, rim = true, dir0 = -.05) {
  const ca = Math.cos(dir0), sa = Math.sin(dir0);
  const sp = u => {
    const a = u * len;
    const wave = (Math.sin(u * 5.2 - t * 8.5 * wind + ph) * amp + Math.sin(u * 11 - t * 14 * wind + ph * 2) * amp * .3) * u * wind;
    const droop = (1 - wind) * u * u * len * .5;
    return [from[0] + ca * a - sa * wave, from[1] + sa * a + ca * wave + droop];
  };
  const tw = u => Math.cos(u * 4.2 - t * 7 * wind + ph);
  ribbon(ctx, id, sp, u => lerp(w0, w1, Math.pow(u, .7)) * (.35 + .65 * Math.abs(tw(u))), {
    light: L, tn: T(col), size: sz, rim, rimT: .5, rimW: .22, samples: 26, dryEdge: .84, cap1: .15,
    fold: (u, v) => (tw(u) < 0 ? -.6 : 0) + Math.sin(v * 3 + u * 9 - t * 9 * wind + ph) * .3 * u,
  });
}

// ---------- LIFT: facing right, on the wagon, the sheaf raised up and to the right ----------
const mir = pts => pts.map(([x, y]) => [-x, y]);
const HEAD_R = mir(HEAD_L).map(([x, y]) => [x, y]);
const HAIR_R = mir(HAIR_L);
export const LIFT = {
  armN: { sh: [-58, 190], el: [-132, 286], wr: [-206, 356] },  // near arm thrown back and down: the counterweight
  armF: { sh: [62, 182], el: [128, 60], wr: [186, -62] },       // far arm raised, the sheaf in the fist
};
const LEAN2 = .1;
export function paintLiftBody(ctx, L, sz, seed = 700) {
  ctx.save();
  ctx.translate(ROOT[0], ROOT[1]); ctx.rotate(LEAN2); ctx.translate(-ROOT[0], -ROOT[1]);
  const Ll = rotLight(L, -LEAN2);
  form(ctx, { pts: mir(BOOT_B), col: C.boot, dir: 0, size: sz * .5, d1: 8, d2: 24, light: Ll, seed: seed + 1, bias: -.6 });
  form(ctx, { pts: mir(BOOT_F), col: C.boot, dir: 0, size: sz * .5, d1: 8, d2: 24, light: Ll, rim: true, seed: seed + 2 });
  // skirt blown forward (to the right) by the wind at her back
  const SK = [[-58, 404], [58, 404], [84, 480], [130, 580], [176, 700], [214, 818], [196, 858], [114, 872], [30, 866], [-40, 872], [-86, 860], [-80, 800], [-70, 720], [-66, 600], [-62, 500]];
  form(ctx, { solid: [mir(TORSO)], pts: SK, col: C.skirt, dir: (x, y) => Math.PI / 2 - x * .0018 * (y - 400) / 400, size: sz, d1: 30, d2: 110, light: Ll, rim: true, seed: seed + 3, dry: (x, y, s) => y > 840 && H(s, 3) < .6 });
  form(ctx, { solid: [SK, mir(NECK)], pts: mir(TORSO), col: C.blouse, dir: (x, y) => Math.PI / 2 - x * .004, size: sz * .8, d1: 18, d2: 60, light: Ll, rim: true, seed: seed + 4 });
  form(ctx, { solid: [mir(TORSO), SK], pts: mir(VEST), col: C.vest, dir: Math.PI / 2, size: sz * .8, d1: 16, d2: 56, light: Ll, rim: true, seed: seed + 5 });
  // head tipped back a little, looking up at the sheaf
  ctx.save(); ctx.translate(0, 150); ctx.rotate(-.22); ctx.translate(0, -150);
  const Lh = rotLight(Ll, .22);
  form(ctx, { pts: mir(NECK), col: C.skin, dir: Math.PI / 2, size: sz * .5, d1: 10, d2: 26, light: Lh, seed: seed + 10, bias: -.2 });
  form(ctx, { pts: HEAD_R, col: C.skin, dir: (x, y) => Math.PI / 2 - (x - 10) * .01, size: sz * .36, d1: 12, d2: 40, light: Lh, rim: true, rimT: .4, seed: seed + 11, soft: 4 });
  const [dk, md, lt] = T(C.skin);
  marks(ctx, [
    [36, 56, 26, 12, -.1, mix(dk, hex(C.skin), .3), .7],
    [35, 58, 17, 6, -.12, mul(dk, .55)], [39, 58, 6, 6, 0, hex('#24150F')], [56, 58, 9, 5, -.2, mul(dk, .6)],
    [36, 47, 22, 5, .12, mul(dk, .8)], [56, 47, 10, 4, -.1, mul(dk, .8)],
    [62, 82, 10, 6, .3, dk], [50, 101, 18, 5, -.1, mix(dk, hex('#8E3A2A'), .55)],
    [40, 76, 40, 9, 1.6, lt, .6], [44, 30, 32, 8, 1.4, lt, .55], [64, 66, 14, 5, 1.3, lt, .7],
    [-14, 72, 14, 20, 1.5, mix(dk, md, .4), .9],
  ], seed + 12);
  form(ctx, { pts: HAIR_R, col: C.hair, dir: (x, y) => Math.atan2(y - 60, x) + Math.PI / 2, size: sz * .4, d1: 10, d2: 30, light: Lh, rim: true, rimT: .4, hiC: mix(P.hi, hex(C.hair), .25), seed: seed + 13, tk: { lk: .3 } });
  form(ctx, { pts: ellipse(-72, 84, 22, 17, 12, -.3), col: C.hair, dir: -.6, size: sz * .3, d1: 8, d2: 20, light: Lh, rim: true, seed: seed + 14, tk: { lk: .3 } });
  ctx.restore();
  form(ctx, { solid: [mir(TORSO), mir(NECK)], pts: mir(WRAP), col: C.shawl, dir: (x, y) => Math.atan2(y - 300, x - 20) + Math.PI / 2, size: sz * .7, d1: 14, d2: 44, light: Ll, rim: true, seed: seed + 40 });
  ctx.restore();
}
// the raised far arm with its fist (drawn behind the body, in a group the film rotates about the shoulder)
export function paintLiftFarArm(ctx, L, sz, seed = 750) {
  ctx.save();
  ctx.translate(ROOT[0], ROOT[1]); ctx.rotate(LEAN2); ctx.translate(-ROOT[0], -ROOT[1]);
  const Ll = rotLight(L, -LEAN2);
  const dF = sleeveAndForearm(ctx, LIFT.armF, Ll, sz, seed, true);
  fist(ctx, LIFT.armF.wr, dF, Ll, sz, seed + 6);
  ctx.restore();
}
export function paintLiftArm(ctx, L, sz, seed = 760) {
  ctx.save();
  ctx.translate(ROOT[0], ROOT[1]); ctx.rotate(LEAN2); ctx.translate(-ROOT[0], -ROOT[1]);
  const Ll = rotLight(L, -LEAN2);
  const dN = sleeveAndForearm(ctx, LIFT.armN, Ll, sz, seed, false);
  pointingHand(ctx, LIFT.armN.wr, dN, Ll, sz, seed + 6);
  ctx.restore();
}
export const liftPt = p => rotAbout(ROOT, LEAN2)(p);
export function paintLiftCloth(ctx, L, sz, t, wind = 1) {
  const sh = liftPt([-84, 178]);
  streamer(ctx, 'lf:shawl', sh, 600, 70, 180, C.shawl, t, wind, .7, L, sz, 40, true, -.12);
  const nape = liftPt([-66, 70]);
  for (let i = 0; i < 4; i++) streamer(ctx, 'lf:hair' + i, [nape[0] + i * 3, nape[1] + i * 7], 170 - i * 24, 16, 3, C.hair, t, wind, 2.1 + i * 1.7, L, sz * .35, 14, false, -.2);
}
// the sheaf between her fists, ears to the upper right
export function paintLiftSheaf(ctx, L, sz, t) {
  const w = liftPt(LIFT.armF.wr), e = liftPt(LIFT.armF.el), d = Math.atan2(w[1] - e[1], w[0] - e[0]);
  const m = [w[0] + Math.cos(d) * 70 + 20, w[1] + Math.sin(d) * 70 - 40];
  sheaf(ctx, 'lf:sheaf', m, -1.15, 500, L, sz * .6, T, t);
}
