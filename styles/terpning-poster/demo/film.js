// THE LAST FIELD · 最后一块麦田 — Terpning Epic Poster Gouache demo. One deterministic render(t).
import { clamp, lerp, seg, ss, eio, eo, ei, back, spring, hash } from '/core/lib.js';
import { P, css, mix, hex, mul, tones, stroke, cached, finish, whipBlur, canvas, H, R } from './engine/gouache.js';
import { figure, sheaf } from './engine/figure.js';
import * as HERO from './scenes/hero.js';
import * as HEAD from './scenes/head.js';
import * as LAND from './scenes/land.js';
import { T, DUR, BEAT, BAR, at } from './timeline.js';

const W = 1920, Hh = 1080, L = [.88, -.47];
let ctx, buf, bctx;

// ---------- cached paintings ----------
const RES = 1.25;
function plate(key, box, draw, res = RES) {
  const [x0, y0, x1, y1] = box;
  const cv = cached(key, (x1 - x0) * res, (y1 - y0) * res, c => { c.setTransform(res, 0, 0, res, -x0 * res, -y0 * res); draw(c); });
  return { cv, box };
}
const put = (c, p) => c.drawImage(p.cv, p.box[0], p.box[1], p.box[2] - p.box[0], p.box[3] - p.box[1]);

// the hero's static bodies, painted once at 1.2 px per unit
const heroPoint = () => plate('heroPoint', [-420, -300, 520, 1040], c => HERO.paintPointBody(c, L, 28), 1.2);
const heroLift = (lit) => plate('heroLift' + lit, [-420, -300, 560, 1040], c => HERO.paintLiftBody(c, lit ? L : [.6, -.8], 28), 1.2);

// ---------- camera ----------
// world = frame px of the shot's reference framing. cam {x, y, z}; a layer with parallax p moves p as much.
function view(c, cam, ref, p = 1) {
  const z = 1 + (cam.z - 1) * p, x = ref.x + (cam.x - ref.x) * p, y = ref.y + (cam.y - ref.y) * p;
  c.setTransform(z, 0, 0, z, W / 2 - x * z, Hh / 2 - y * z);
  return [z, 0, 0, z, W / 2 - x * z, Hh / 2 - y * z];
}

// ---------- type (poster lettering) ----------
function posterText(c, txt, x, y, o) {
  c.save();
  c.font = `${o.weight || 900} ${o.size}px ${o.font || 'Cinzel'}`;
  c.textAlign = o.align || 'center'; c.textBaseline = 'alphabetic';
  if (o.track) c.letterSpacing = o.track + 'px';
  const depth = o.depth ?? Math.round(o.size * .06);
  for (let i = depth; i > 0; i--) { c.fillStyle = css(mix(hex('#5A2414'), hex('#8E3F22'), i / depth)); c.fillText(txt, x + i * .7, y + i); }
  c.fillStyle = css(o.color || P.hi); c.fillText(txt, x, y);
  if (o.shine !== false) { c.globalAlpha = .35; c.fillStyle = css(P.cream); c.fillText(txt, x - 1, y - 1); }
  c.restore();
  c.font = `${o.weight || 900} ${o.size}px ${o.font || 'Cinzel'}`; if (o.track) c.letterSpacing = o.track + 'px';
  const w = c.measureText(txt).width; c.letterSpacing = '0px';
  const x0 = (o.align === 'left') ? x : (o.align === 'right') ? x - w : x - w / 2;
  return { x0, y0: y - o.size * .8, x1: x0 + w, y1: y + o.size * .2 };
}
let TXT = [];
function tag(id, en, cn, x, y, t, t0, t1, size = 52) {
  if (t < t0 || t > t1) return;
  const k = eo(seg(t, t0, t0 + .35)), out = 1 - seg(t, t1 - .3, t1);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(k, out);
  const dy = (1 - back(seg(t, t0, t0 + .45), 2.2)) * -30;
  const b1 = posterText(ctx, en, x, y + dy, { size, track: size * .12 });
  const b2 = posterText(ctx, cn, x, y + dy + size * 1.15, { size: size * .78, font: 'NotoSerifSC', track: size * .3, depth: 3 });
  ctx.restore();
  if (k > .99 && out > .99) { TXT.push({ id: id + 'en', text: en, ...b1 }); TXT.push({ id: id + 'cn', text: cn, ...b2 }); }
}

// ---------- shared pieces ----------
const reapPose = (k) => {   // k 0 → 1: backswing → through-swing
  const a = { lean: .5, neck: -.15, shN: 1.25, elN: .35, shF: .55, elF: .7, hipN: .45, knN: -.5, hipF: -.28, knF: -.18, ry: .035 };
  const b = { lean: .42, neck: -.1, shN: -.45, elN: .45, shF: -.95, elF: .65, hipN: .45, knN: -.5, hipF: -.28, knF: -.18, ry: .04 };
  const o = {}; for (const key in a) o[key] = lerp(a[key], b[key], k); return o;
};
// a swing that strikes on the beat: fast through, slow recovery
const swing = (t, t0, period) => { const u = ((t - t0) % period + period) % period / period; return u < .28 ? eo(u / .28) : 1 - ss((u - .28) / .72); };

function crew(c, list, t, wind) {
  for (const f of list) figure(c, f.pose(t), { x: f.x, y: f.y, s: f.s, id: f.id, light: L, size: f.size || Math.max(4, f.s * .028), t: t + f.ph, costume: f.costume, hold: f.hold, cloth: false, loose: true, haze: f.haze || 0, facing: f.facing ?? -1, wind });
}
const gustAt = t => 1 + .55 * Math.exp(-((t - 1.2) ** 2) / .5) + .5 * Math.exp(-((t - T.point - .1) ** 2) / .08) + .45 * Math.exp(-((t - T.lift - .2) ** 2) / .2);

// ---------- shots ----------
const STORM1 = LAND.stormBalls(4, -300, 1350, [80, 420], 650, 46, 120, 260);
const SHOTS = [
  { // 1 · low wide: the storm wall over the last field
    t0: 0, t1: T.cut2, ref: { x: 960, y: 540 },
    cam: t => ({ x: 960 + t * 14, y: 540 - t * 4, z: 1 + ss(t / 5) * .07 }),
    draw(c, t, cam) {
      const ref = this.ref, hz = 700, sun = [1640, 610];
      const storm = (x, y) => clamp(1.1 - x / 1300) * clamp((hz - y) / 300 + .3);
      view(c, cam, ref, .25); put(c, plate('s1sky', [-200, -120, 2300, hz + 40], g => { LAND.paintSky(g, { box: [-200, -120, 2300, hz + 40], hz, sun, storm, size: 30, glow: 560 }); LAND.paintSun(g, sun[0], sun[1], 34); }));
      view(c, cam, ref, .4); put(c, plate('s1storm', [-450, -150, 1700, hz + 20], g => LAND.paintStorm(g, STORM1, { light: [.92, -.25, .25], size: 26 })));
      view(c, cam, ref, .6); put(c, plate('s1hz', [-200, hz - 80, 2300, hz + 30], g => LAND.paintHorizon(g, { box: [-200, hz - 80, 2300, hz + 30], hz, ridge: 26, houses: [[1380, 34, 22], [1430, 26, 18], [1470, 40, 26], [1530, 22, 16]] })));
      const m = view(c, cam, ref, .85); put(c, plate('s1field', [-200, hz - 6, 2300, 1260], g => LAND.paintField(g, { box: [-200, hz - 6, 2300, 1260], hz, H: 1180, size: 30, shadow: (x, y) => x < 700 - (y - hz) * .8 })));
      crew(c, [
        { id: 'c1', x: 520, y: hz + 70, s: 95, costume: 'reaper', hold: 'scythe', pose: t => reapPose(swing(t, .1, BEAT * 2)), ph: 0, haze: .25 },
        { id: 'c2', x: 640, y: hz + 92, s: 110, costume: 'reaper2', hold: 'scythe', pose: t => reapPose(swing(t, .5, BEAT * 2)), ph: 1, haze: .2 },
        { id: 'c3', x: 1300, y: hz + 60, s: 85, costume: 'woman2', pose: () => ({ lean: .1, shN: .6, elN: .8, shF: -.3, elF: .5, hipN: .2, knN: -.1, hipF: -.15 }), ph: 2, haze: .3, facing: -1 },
        { id: 'c4', x: 1390, y: hz + 75, s: 100, costume: 'reaper', hold: 'scythe', pose: t => reapPose(swing(t, .9, BEAT * 2)), ph: 3, haze: .25 },
      ], t, gustAt(t));
      // the hero on the rise, centred: watching the storm, the arm at her side
      view(c, cam, ref, 1);
      c.save(); c.translate(960, 1010); c.scale(.36, .36); c.translate(0, -1000);
      HERO.paintPointCloth(c, L, 28, t, gustAt(t));
      HERO.paintPointArm(c, L, 28, 2.15);
      put(c, heroPoint());
      c.restore();
      view(c, cam, ref, 1.25);
      LAND.nearWheat(c, { x0: -300, x1: 2300, y: 1020, h: 260, n: 150, light: L, depth: 80, wind: gustAt(t) }, t);
      LAND.chaff(c, { x0: -200, x1: 2200, y0: 500, y1: 1000, n: 50 }, t);
      return { haze: { y: 700 * cam.z - 40, h: 160, c: P.cream, a: .22 }, grainM: m };
    },
    texts(t) { tag('t1', 'THE STORM COMES AT SUNDOWN', '风暴日落时到', 1160, 190, t, T.tag1, T.cut2 - .1, 50); },
  },
  { // 2 · the hero, low angle: the call
    t0: T.cut2, t1: T.cut3, ref: { x: 960, y: 540 },
    cam(t) { const b = Math.exp(-Math.max(0, t - T.point) * 7) * Math.sin(Math.max(0, t - T.point) * 26) * (t > T.point ? 1 : 0); return { x: 960, y: 540 - b * 10, z: 1.0 + (t - T.cut2) * .006 + b * .012 }; },
    draw(c, t, cam) {
      const ref = this.ref, hz = 900, sun = [1700, 820];
      const storm = (x, y) => clamp(1.15 - x / 1100) * clamp((hz - y) / 400 + .4);
      view(c, cam, ref, .2); put(c, plate('s2sky', [-200, -150, 2200, hz + 30], g => { LAND.paintSky(g, { box: [-200, -150, 2200, hz + 30], hz, sun, storm, size: 34, glow: 620 }); LAND.paintSun(g, sun[0], sun[1], 40); }));
      view(c, cam, ref, .35); put(c, plate('s2storm', [-500, -200, 1300, hz], g => LAND.paintStorm(g, LAND.stormBalls(17, -400, 1150, [40, 520], 880, 40, 150, 300), { light: [.92, -.25, .25], size: 30 })));
      view(c, cam, ref, .55); put(c, plate('s2hz', [-200, hz - 60, 2200, hz + 20], g => LAND.paintHorizon(g, { box: [-200, hz - 60, 2200, hz + 20], hz, ridge: 18, seed: 5 })));
      const m = view(c, cam, ref, .8); put(c, plate('s2field', [-200, hz - 6, 2200, 1250], g => LAND.paintField(g, { box: [-200, hz - 6, 2200, 1250], hz, H: 1250, size: 30, ph: 2 })));
      crew(c, [
        { id: 'd1', x: 300, y: hz + 30, s: 70, costume: 'reaper', hold: 'scythe', pose: () => reapPose(.2), ph: 0, haze: .35 },
        { id: 'd2', x: 1560, y: hz + 40, s: 76, costume: 'reaper2', hold: 'scythe', pose: () => reapPose(.6), ph: 1, haze: .35, facing: -1 },
      ], t, 1);
      view(c, cam, ref, 1);
      // arm: hangs, dips (anticipation), snaps up past the line and settles (follow-through)
      const a0 = 2.15, dip = 2.4;
      let ang = t < T.dip ? a0 : t < T.point ? lerp(a0, dip, ss(seg(t, T.dip, T.point))) : lerp(dip, 0, back(seg(t, T.point, T.point + .32), 1.6));
      c.save(); c.translate(1010, 120); c.scale(.97, .97);
      HERO.paintPointCloth(c, L, 28, t, gustAt(t));
      put(c, heroPoint());
      HERO.paintPointArm(c, L, 28, ang);
      c.restore();
      view(c, cam, ref, 1.3);
      LAND.chaff(c, { x0: -200, x1: 2200, y0: 300, y1: 1000, n: 60, k: 1.4 }, t);
      return { haze: { y: hz, h: 120, c: P.cream, a: .18 }, grainM: m };
    },
    texts(t) { tag('t2', 'ONE FIELD LEFT', '只剩最后一块地', 430, 905, t, T.point - .35, T.cut3 - .1, 56); },
  },
  { // 3 · reapers on a receding diagonal, striking on the beat
    t0: T.cut3, t1: T.whip4, ref: { x: 960, y: 540 }, whipOut: [1, 0],
    cam: t => ({ x: 900 + (t - T.cut3) * 40, y: 540, z: 1.04 }),
    draw(c, t, cam) {
      const ref = this.ref, hz = 520, sun = [1900, 470];
      const storm = (x, y) => clamp(1.2 - x / 1500);
      view(c, cam, ref, .25); put(c, plate('s3sky', [-200, -150, 2300, hz + 30], g => { LAND.paintSky(g, { box: [-200, -150, 2300, hz + 30], hz, sun, storm, size: 30, glow: 500 }); }));
      view(c, cam, ref, .4); put(c, plate('s3storm', [-400, -200, 1500, hz], g => LAND.paintStorm(g, LAND.stormBalls(29, -300, 1400, [20, 300], 500, 40, 100, 200), { light: [.92, -.25, .25], size: 24 })));
      view(c, cam, ref, .55); put(c, plate('s3hz', [-200, hz - 50, 2300, hz + 20], g => LAND.paintHorizon(g, { box: [-200, hz - 50, 2300, hz + 20], hz, ridge: 14, seed: 9 })));
      const m = view(c, cam, ref, .85); put(c, plate('s3field', [-200, hz - 6, 2300, 1250], g => LAND.paintField(g, { box: [-200, hz - 6, 2300, 1250], hz, H: 1150, size: 30, ph: 4, shadow: (x, y) => x > 1300 + (y - hz) * .2 })));
      crew(c, [
        { id: 'r3', x: 1500, y: 700, s: 240, size: 7, costume: 'reaper2', hold: 'scythe', pose: t => reapPose(swing(t, T.cut3 + .25, BEAT * 2)), ph: .4, haze: .15 },
        { id: 'r2', x: 1130, y: 820, s: 360, size: 9, costume: 'woman2', hold: 'scythe', pose: t => reapPose(swing(t, T.cut3 + .12, BEAT * 2)), ph: .2, haze: .05 },
        { id: 'r1', x: 640, y: 1000, s: 520, size: 12, costume: 'reaper', hold: 'scythe', pose: t => reapPose(swing(t, T.cut3, BEAT * 2)), ph: 0 },
      ], t, 1.1);
      view(c, cam, ref, 1.25);
      LAND.nearWheat(c, { x0: -300, x1: 600, y: 1060, h: 380, n: 70, light: L, depth: 60, seed: 9 }, t);
      LAND.chaff(c, { x0: -200, x1: 2200, y0: 600, y1: 1050, n: 70, k: 1.2, seed: 5 }, t);
      return { haze: { y: hz, h: 120, c: P.cream, a: .2 }, grainM: m };
    },
  },
  { // 4 · the wagon: sheaves tossed up land on the heap
    t0: T.whip4, t1: T.whip5, ref: { x: 960, y: 540 }, whipIn: [1, 0], whipOut: [0, -1],
    cam: t => { const k = ss(seg(t, T.whip4, T.whip5)); return { x: 960, y: 600 - k * 110, z: 1.0 + k * .04 }; },
    draw(c, t, cam) {
      const ref = this.ref, hz = 760, sun = [1500, 700];
      const storm = (x, y) => clamp(1.1 - x / 1200) * .9;
      view(c, cam, ref, .25); put(c, plate('s4sky', [-200, -200, 2300, hz + 30], g => { LAND.paintSky(g, { box: [-200, -200, 2300, hz + 30], hz, sun, storm, size: 30, glow: 600 }); LAND.paintSun(g, sun[0], sun[1], 32); }));
      view(c, cam, ref, .4); put(c, plate('s4storm', [-400, -250, 1400, hz], g => LAND.paintStorm(g, LAND.stormBalls(41, -300, 1300, [-60, 300], 640, 44, 120, 240), { light: [.92, -.25, .25], size: 26 })));
      const m = view(c, cam, ref, .8); put(c, plate('s4field', [-200, hz - 6, 2300, 1300], g => { LAND.paintHorizon(g, { box: [-200, hz - 60, 2300, hz + 10], hz, ridge: 16, seed: 3 }); LAND.paintField(g, { box: [-200, hz - 6, 2300, 1300], hz, H: 1250, size: 30, ph: 1 }); }));
      view(c, cam, ref, 1);
      c.save(); c.translate(900, 1010); c.scale(.82, .82);
      put(c, plate('wagon', [-820, -620, 560, 40], g => LAND.paintWagon(g, L, 30, 1)));
      c.restore();
      // tossed sheaves: arc in from the lower left, land with a bounce
      T.toss.forEach((tt, i) => {
        const u = (t - tt) / .55; if (u < 0) return;
        const from = [140 + i * 120, 1250], to = [760 + i * 230, 590 - i * 20];
        const k = clamp(u), x = lerp(from[0], to[0], k), y = lerp(from[1], to[1], k) - Math.sin(k * Math.PI) * 420;
        const land = u > 1 ? Math.exp(-(u - 1) * 6) * Math.sin((u - 1) * 18) * 18 : 0;
        const ang = u < 1 ? -1.2 + k * 4.2 : -.25 + i * .3;
        sheaf(c, 'toss' + i, [x, y + land], ang, 230 * .82, L, 15, undefined, t);
      });
      view(c, cam, ref, 1.3);
      LAND.chaff(c, { x0: -200, x1: 2200, y0: 400, y1: 1050, n: 80, k: 1.3, seed: 8, speed: 320 }, t);
      return { haze: { y: hz, h: 120, c: P.cream, a: .18 }, grainM: m };
    },
  },
  { // 5 · the sky: the wall swallows the sun; lightning
    t0: T.whip5, t1: T.cut6, ref: { x: 960, y: 540 }, whipIn: [0, -1],
    cam: t => { const k = seg(t, T.whip5, T.cut6); return { x: 960 + k * 60, y: 560, z: 1.0 + ss(k) * .1 }; },
    draw(c, t, cam) {
      const ref = this.ref, hz = 1000, k = seg(t, T.whip5, T.cut6);
      const sun = [1250, 760];
      view(c, cam, ref, .3); put(c, plate('s5sky', [-200, -200, 2300, 1300], g => { LAND.paintSky(g, { box: [-200, -200, 2300, 1300], hz, sun, size: 34, glow: 700 }); LAND.paintSun(g, sun[0], sun[1], 46); }));
      // the wall advances across the sun
      view(c, cam, ref, .6);
      c.save(); c.translate(-520 + ss(k) * 760, 0);
      put(c, plate('s5storm', [-900, -300, 1300, 1300], g => LAND.paintStorm(g, LAND.stormBalls(53, -800, 1150, [-100, 100], 1250, 70, 160, 330), { light: [.95, -.15, .3], size: 30 })));
      c.restore();
      const m = view(c, cam, ref, .9); put(c, plate('s5ridge', [-200, 900, 2300, 1300], g => { LAND.paintHorizon(g, { box: [-200, 900, 2300, 1010], hz: 1000, ridge: 40, seed: 2 }); g.fillStyle = css(mix(P.violet, P.umber, .4)); g.fillRect(-200, 1000, 2500, 300); }));
      // lightning: one painted bolt and a flash
      const f = t - T.bolt;
      if (f > 0 && f < .5) {
        view(c, cam, ref, .6);
        c.save(); c.translate(-520 + ss(k) * 760, 0);
        let x = 820, y = 260; const pts = [[x, y]];
        for (let i = 0; i < 9; i++) { x += R(i, 1, -60, 60); y += R(i, 2, 60, 95); pts.push([x, y]); }
        c.globalAlpha = f < .12 ? 1 : f < .2 ? .2 : f < .3 ? .9 : 1 - (f - .3) / .2;
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = css(mix(P.hi, P.pale, .3)); c.lineWidth = 16; c.globalAlpha *= .35; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke();
        c.globalAlpha /= .35; c.strokeStyle = css(P.hi); c.lineWidth = 5; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke();
        c.restore();
      }
      return { flash: f > 0 && f < .35 ? (f < .12 ? .35 : f < .2 ? .05 : .25 * (1 - (f - .2) / .15)) : 0, grainM: m };
    },
  },
  { // 6 · silence: a slow push to a low close-up of her profile; the first drop
    t0: T.cut6, t1: T.cut7, ref: { x: 960, y: 540 },
    cam: t => { const k = ss(seg(t, T.cut6, T.cut7 - .3)); return { x: lerp(960, 885, k), y: lerp(560, 640, k), z: lerp(1, 1.7, k) }; },
    draw(c, t, cam) {
      const ref = this.ref, hz = 1180, sun = [2400, 1100];
      const storm = (x, y) => .55 + .35 * clamp(1 - x / 2000);
      view(c, cam, ref, .25); put(c, plate('s6sky', [-300, -200, 2300, 1300], g => LAND.paintSky(g, { box: [-300, -200, 2300, 1300], hz, sun, storm, size: 36, glow: 900 })));
      view(c, cam, ref, .45); put(c, plate('s6storm', [-600, -300, 2600, 700], g => LAND.paintStorm(g, LAND.stormBalls(67, -500, 2500, [-150, 0], 650, 50, 180, 330), { light: [.7, .2, .35], size: 34, bias: -.35 })));
      const m = view(c, cam, ref, 1);
      LAND.chaff(c, { x0: -200, x1: 2200, y0: 100, y1: 500, n: 10, k: .8, seed: 21, speed: 90 }, t);
      const wind = .35 + .2 * Math.sin(t * .8);
      c.save(); c.translate(960, 600);
      HEAD.paintHeadCloth(c, L, 30, t, wind);
      put(c, plate('head', [-420, -330, 460, 560], g => HEAD.paintHead(g, L, 30), 2));
      HEAD.paintDrop(c, t, T.drop);
      c.restore();
      return { grainM: m, vig: .7 };
    },
  },
  { // 7 · the last sheaf goes up and the light breaks (and 8 · the whip out to the poster)
    t0: T.cut7, t1: DUR, ref: { x: 960, y: 540 },
    cam(t) {
      if (t < T.whip8) { const k = ss(seg(t, T.cut7, T.whip8)); return { x: 960 + k * 10, y: lerp(470, 420, k), z: lerp(1.22, 1.34, k) }; }
      const k = eio(seg(t, T.whip8, T.whip8 + .55)), s = 1 - Math.exp(-Math.max(0, t - T.whip8 - .55) * 5);
      return { x: lerp(970, 960, k), y: lerp(420, 690, k), z: lerp(1.34, .68, k) - s * .0 + (t > T.whip8 + .55 ? Math.exp(-(t - T.whip8 - .55) * 6) * Math.sin((t - T.whip8 - .55) * 22) * .012 : 0) };
    },
    draw(c, t, cam) {
      const ref = this.ref, hz = 840, lit = t > T.lift;
      const breakK = ss(seg(t, T.lift, T.lift + 1.2));
      const sun = [1720, 700];
      const storm = (x, y) => clamp(1.25 - x / 1250) * clamp((hz - y) / 500 + .5);
      view(c, cam, ref, .55); put(c, plate('s7sky', [-1100, -900, 3100, hz + 40], g => { LAND.paintSky(g, { box: [-1100, -900, 3100, hz + 40], hz, sun, storm, size: 34, glow: 620 }); LAND.paintSun(g, sun[0], sun[1], 40); }, 1));
      view(c, cam, ref, .65); put(c, plate('s7storm', [-1300, -1000, 1500, hz], g => LAND.paintStorm(g, LAND.stormBalls(79, -1200, 1400, [-850, -150], 820, 80, 140, 320), { light: [.92, -.25, .25], size: 30 }), 1));
      const m = view(c, cam, ref, .85); put(c, plate('s7field', [-1100, hz - 80, 3100, 1900], g => { LAND.paintHorizon(g, { box: [-1100, hz - 80, 3100, hz + 10], hz, ridge: 22, seed: 7, houses: [[1500, 30, 20], [1545, 24, 16], [1590, 36, 24]] }); LAND.paintField(g, { box: [-1100, hz - 6, 3100, 1900], hz, H: 1800, size: 32, ph: 3 }); }, 1));
      // the dim world before the break: a cool veil lifts as the sun comes under the cloud
      view(c, cam, ref, 1);
      c.save(); c.translate(960, 1020); c.scale(.75, .75);
      put(c, plate('wagon7', [-820, -620, 560, 40], g => LAND.paintWagon(g, L, 30, 1.2)));
      c.restore();
      crew(c, [
        { id: 'e1', x: 470, y: 1050, s: 230, size: 7, costume: 'reaper', pose: tt => ({ lean: -.1, neck: -.35, shN: lerp(.3, 2.6, ss(seg(tt, T.lift, T.lift + .5))), elN: .2, shF: lerp(-.2, 2.3, ss(seg(tt, T.lift + .1, T.lift + .6))), elF: .3, hipN: .1, hipF: -.1 }), ph: 0, facing: 1 },
        { id: 'e2', x: 1430, y: 1060, s: 245, size: 7, costume: 'woman2', pose: tt => ({ lean: -.05, neck: -.3, shN: lerp(.2, 2.5, ss(seg(tt, T.lift + .15, T.lift + .65))), elN: .3, shF: -.3, elF: .5, hipN: .1, hipF: -.1 }), ph: 1, facing: -1 },
        { id: 'e3', x: 1620, y: 1110, s: 270, size: 8, costume: 'reaper2', hold: 'scythe', pose: () => reapPose(.15), ph: 2, facing: -1 },
      ], t, 1);
      // the hero on the heap
      c.save(); c.translate(925, 160); c.scale(.62, .62);
      HERO.paintLiftCloth(c, L, 28, t, gustAt(t));
      // the raised arm and the sheaf: from the hip (breath, a dip) to the full lift, overshoot and settle
      const raise = t < T.breath ? 2.1 : t < T.lift ? lerp(2.1, 2.3, ss(seg(t, T.breath, T.lift))) : lerp(2.3, 0, back(seg(t, T.lift, T.lift + .45), 1.4));
      liftArm(c, raise, t);
      put(c, heroLift(1));
      HERO.paintLiftArm(c, L, 28);
      c.restore();
      view(c, cam, ref, 1.15);
      LAND.chaff(c, { x0: -1200, x1: 3000, y0: -300, y1: 1300, n: 90, k: 1.3, seed: 12 }, t);
      LAND.rain(c, { x0: -1200, x1: 3000, y0: -600, y1: 1500, n: 260 }, t, .25 + .5 * seg(t, T.cut7, T.lift));
      return { haze: { y: hz, h: 160, c: P.cream, a: .15 + breakK * .1 }, grainM: m, warm: breakK, cool: 1 - breakK };
    },
    texts(t) { if (t > T.whip8 + .4) poster(t); },
  },
];

// LIFT's raised arm and sheaf, rotated about the far shoulder
function liftArm(c, ang, t) {
  const sh = HERO.liftPt([62, 182]);
  c.save(); c.translate(sh[0], sh[1]); c.rotate(ang); c.translate(-sh[0], -sh[1]);
  const Lr = HERO.rotLight(L, -ang);
  HERO.paintLiftSheaf(c, Lr, 28, t);
  HERO.paintLiftFarArm(c, Lr, 28);
  c.restore();
}

// the poster's lettering and board edge
function poster(t) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const letters = 'THE LAST FIELD'.split('');
  ctx.font = '900 150px Cinzel'; ctx.letterSpacing = '14px';
  const full = ctx.measureText('THE LAST FIELD').width; let x = W / 2 - full / 2;
  const y = 850;
  letters.forEach((ch, i) => {
    ctx.font = '900 150px Cinzel'; ctx.letterSpacing = '14px';
    const w = ctx.measureText(ch).width;
    const t0 = T.title + i * BEAT / 2 * .5;
    if (t >= t0 && ch !== ' ') {
      const u = t - t0, drop = (1 - spring(u * 1.6, 9, .32)) * -140;
      ctx.save(); posterText(ctx, ch, x + w / 2, y + drop, { size: 150, depth: 9 }); ctx.restore();
    }
    x += w;
  });
  ctx.letterSpacing = '0px';
  if (t > T.title + 7 * BEAT / 4) TXT.push({ id: 'title', text: 'THE LAST FIELD', x0: W / 2 - full / 2, y0: y - 125, x1: W / 2 + full / 2, y1: y + 30 });
  const cnT = T.title + 1.2;
  if (t > cnT) {
    ctx.globalAlpha = eo(seg(t, cnT, cnT + .4));
    const b = posterText(ctx, '最后一块麦田', W / 2, y + 92, { size: 62, font: 'NotoSerifSC', track: 30, depth: 4 });
    if (t > cnT + .4) TXT.push({ id: 'titlecn', text: '最后一块麦田', ...b });
  }
  // the board's edge: a cream margin drawn in as the painting settles into a poster
  const bk = eo(seg(t, T.whip8 + .5, T.whip8 + 1.3));
  if (bk > 0) {
    const m = 26 * bk;
    ctx.globalAlpha = 1; ctx.fillStyle = css(mix(P.cream, P.hi, .4));
    ctx.fillRect(0, 0, W, m); ctx.fillRect(0, Hh - m, W, m); ctx.fillRect(0, 0, m, Hh); ctx.fillRect(W - m, 0, m, Hh);
    ctx.strokeStyle = css(mix(P.ochre, P.umber, .3), .6); ctx.lineWidth = 2; ctx.strokeRect(m, m, W - 2 * m, Hh - 2 * m);
  }
  const bt = T.chord - .35;
  if (t > bt) {
    ctx.globalAlpha = eo(seg(t, bt, bt + .5));
    const b1 = posterText(ctx, 'TERPNING EPIC POSTER GOUACHE · 史诗海报水粉', W / 2, 1010, { size: 26, font: 'Oswald', weight: 500, track: 5, depth: 2, shine: false });
    const b2 = posterText(ctx, 'LemoLab × Claude', W / 2, 1046, { size: 20, font: 'Oswald', weight: 400, track: 3, depth: 1, shine: false, color: P.cream });
    if (t > bt + .5) { TXT.push({ id: 'bill', text: 'TERPNING EPIC POSTER GOUACHE · 史诗海报水粉', ...b1 }); TXT.push({ id: 'sign', text: 'LemoLab × Claude', ...b2 }); }
  }
  ctx.restore();
}

// cloth wipe: her shawl crosses the lens
function clothWipe(c, t, t0, dur = .4) {
  const u = (t - t0) / dur; if (u < -.1 || u > 1.1) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  HERO.streamer(c, 'wipe', [-1400 + u * 3600, 1250], 1600, 900, 1500, HERO.C.shawl, t, 1.4, 0, L, 60, 160, true, -.5);
  c.restore();
}

// ---------- frame ----------
function shotAt(t) { for (const s of SHOTS) if (t >= s.t0 && t < s.t1) return s; return SHOTS[SHOTS.length - 1]; }
const WHIP = .2;
export async function setup(cv) {
  cv.width = W; cv.height = Hh;
  ctx = cv.getContext('2d');
  buf = canvas(W, Hh); bctx = buf.getContext('2d');
  await document.fonts.load('900 40px Cinzel'); await document.fonts.load('900 40px NotoSerifSC'); await document.fonts.load('500 20px Oswald');
  window.DUR = DUR;
  window.EV = events();
  window.TEXTS = t => { TXT = []; drawTexts(t, true); return TXT; };
  return t => frame(t);
}
function drawTexts(t, dry) {
  const s = shotAt(t);
  if (dry) { const c0 = ctx; const off = canvas(4, 4).getContext('2d'); ctx = off; s.texts?.(t); ctx = c0; return; }
  s.texts?.(t);
}
function frame(t) {
  TXT = [];
  const s = shotAt(t);
  // whip offsets: the camera flies out of the outgoing shot and into the next
  let cam = s.cam(t), blur = [0, 0];
  if (s.whipOut && t > s.t1 - WHIP) { const k = ei(seg(t, s.t1 - WHIP, s.t1)); cam = { ...cam, x: cam.x + s.whipOut[0] * k * 560, y: cam.y + s.whipOut[1] * k * 300 }; blur = [s.whipOut[0] * k * 300, s.whipOut[1] * k * 220]; }
  if (s.whipIn && t < s.t0 + WHIP) { const k = 1 - eo(seg(t, s.t0, s.t0 + WHIP)); cam = { ...cam, x: cam.x - s.whipIn[0] * k * 560, y: cam.y - s.whipIn[1] * k * 300 }; blur = [s.whipIn[0] * k * 300, s.whipIn[1] * k * 220]; }
  if (s === SHOTS[6] && t > T.whip8 && t < T.whip8 + .55) { const k = Math.sin(seg(t, T.whip8, T.whip8 + .55) * Math.PI); blur = [k * 120, k * 60]; }
  const c = Math.hypot(blur[0], blur[1]) > 2 ? bctx : ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = css(P.cobalt); c.fillRect(0, 0, W, Hh);
  const o = s.draw(c, t, cam) || {};
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (o.cool) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = o.cool * .35; c.fillStyle = css(mix(P.pale, P.violet, .4)); c.fillRect(0, 0, W, Hh); }
  if (o.warm) { c.globalCompositeOperation = 'soft-light'; c.globalAlpha = o.warm * .45; const g = c.createRadialGradient(1500, 500, 100, 1500, 500, 1500); g.addColorStop(0, css(P.hi)); g.addColorStop(1, css(P.ochre)); c.fillStyle = g; c.fillRect(0, 0, W, Hh); }
  if (o.flash) { c.globalCompositeOperation = 'screen'; c.globalAlpha = o.flash; c.fillStyle = css(mix(P.pale, P.hi, .5)); c.fillRect(0, 0, W, Hh); }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  finish(c, W, Hh, { haze: o.haze, grainM: o.grainM, vig: o.vig });
  if (c === bctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, Hh); whipBlur(ctx, buf, W, Hh, blur[0], blur[1]); }
  drawTexts(t, false);
  // wipes made of cloth
  clothWipe(ctx, t, T.cut2 - .22);
  clothWipe(ctx, t, T.cut7 - .22);
}

// ---------- sound and cue events (for the mixer) ----------
function events() {
  const ev = [];
  ev.push({ t: 0, type: 'wind', amt: 1 }, { t: .9, type: 'gust' }, { t: 1.1, type: 'flap', amt: .8 });
  ev.push({ t: T.cut2 - .22, type: 'wipe' }, { t: T.dip, type: 'cloth', amt: .4 }, { t: T.point, type: 'snap' });
  for (let i = 0; i < 2; i++) { ev.push({ t: T.cut3 + i * BEAT * 2 + .1, type: 'scythe', pan: -.3 }); ev.push({ t: T.cut3 + .12 + i * BEAT * 2 + .1, type: 'scythe', pan: .1, amt: .6 }); }
  ev.push({ t: T.whip4 - .2, type: 'whip' }, { t: T.whip5 - .2, type: 'whip' });
  T.toss.forEach(tt => { ev.push({ t: tt, type: 'toss' }, { t: tt + .55, type: 'land' }); });
  ev.push({ t: T.bolt, type: 'thunder', amt: 1 }, { t: T.cut6 + 2.2, type: 'rumble', amt: .4 }, { t: T.drop, type: 'drop' });
  ev.push({ t: T.cut7 - .22, type: 'wipe' }, { t: T.cut7, type: 'rain', amt: .4 }, { t: T.breath, type: 'breath' }, { t: T.lift, type: 'lift' });
  ev.push({ t: T.whip8, type: 'whipout' });
  for (let i = 0; i < 14; i++) if ('THE LAST FIELD'[i] !== ' ') ev.push({ t: T.title + i * BEAT / 4, type: 'letter', i });
  return ev;
}
