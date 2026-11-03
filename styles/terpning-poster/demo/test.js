// Model sheet: the hero and a reaper in key poses, on a plain warm ground (?test=1)
import { P, css, mix, tones, region, H, R } from './engine/gouache.js';
import { figure, posed } from './engine/figure.js';
import * as HERO from './scenes/hero.js';

export async function setup(cv, q) {
  const mode = q && q.get('test');
  cv.width = 1920; cv.height = 1080;
  const ctx = cv.getContext('2d');
  await document.fonts.ready;
  window.DUR = 4;
  const L = [.86, -.5];
  const poses = {
    stand: { lean: .02, shN: .1, elN: .2, shF: -.15, elF: .3, hipN: .08, knN: -.05, hipF: -.1, knF: -.02 },
    point: { lean: .16, neck: .05, head: .1, shN: 2.35, elN: .1, shF: -.5, elF: .5, hipN: .32, knN: -.25, hipF: -.22, knF: -.1, ry: .015 },
    lift: { lean: -.12, neck: -.18, head: -.12, shN: 2.75, elN: .25, shF: 2.45, elF: .35, hipN: .12, knN: -.1, hipF: -.18, knF: -.05, wrN: .4, wrF: .3 },
    reapA: { lean: .55, neck: -.2, shN: .9, elN: .4, shF: .1, elF: .9, hipN: .45, knN: -.5, hipF: -.25, knF: -.2, ry: .04 },
    reapB: { lean: .45, neck: -.15, shN: -.4, elN: .5, shF: -.9, elF: .8, hipN: .45, knN: -.5, hipF: -.25, knF: -.2, ry: .04 },
  };
  return async t => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, css(P.cobalt)); g.addColorStop(.62, css(P.pale)); g.addColorStop(.63, css(P.ground)); g.addColorStop(1, css(P.ochre));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
    if (mode === '5') {
      ctx.setTransform(1.6, 0, 0, 1.6, 900, -650);
      HERO.paintPointBody(ctx, [.88, -.47], 28);
      return;
    }
    if (mode === '4') {
      const { form } = await import('./engine/forms.js');
      ctx.setTransform(1, 0, 0, 1, 800, -350);
      form(ctx, { pts: [[-58, 404], [58, 404], [92, 480], [140, 580], [186, 700], [222, 818], [206, 858], [124, 872], [40, 866], [-40, 872], [-90, 860], [-100, 820], [-86, 720], [-72, 600], [-66, 500]], col: '#74402E', dir: Math.PI / 2, size: 28, d1: 30, d2: 110, light: [.88, -.47], rim: true, seed: 3, alpha: +(q.get('a') ?? .92) });
      return;
    }
    if (mode === '3') {
      const L2 = [.88, -.47];
      ctx.setTransform(.92, 0, 0, .92, 560, 60);
      HERO.paintPointCloth(ctx, L2, 28, t);
      HERO.paintPointArm(ctx, L2, 28, 0);
      HERO.paintPointBody(ctx, L2, 28);
      ctx.setTransform(.92, 0, 0, .92, 1400, 60);
      HERO.paintLiftCloth(ctx, L2, 28, t);
      HERO.paintLiftBody(ctx, L2, 28);
      HERO.paintLiftSheaf(ctx, L2, 28, t);
      HERO.paintLiftArm(ctx, L2, 28);
      return;
    }
    if (mode === '2') {
      figure(ctx, poses.point, { x: 1000, y: 2050, s: 2100, id: 'h2', light: L, size: 30, t, costume: 'hero' });
      figure(ctx, poses.lift, { x: 1650, y: 1500, s: 1300, id: 'h3', light: [-.86, -.5], size: 22, t, costume: 'hero', hold: 'sheaf', facing: 1 });
      return;
    }
    const S = 560, base = 940;
    figure(ctx, poses.stand, { x: 230, y: base, s: S, id: 'h1', light: L, size: 14, t, costume: 'hero' });
    figure(ctx, poses.point, { x: 640, y: base, s: S, id: 'h2', light: L, size: 14, t, costume: 'hero' });
    figure(ctx, poses.lift, { x: 1060, y: base, s: S, id: 'h3', light: L, size: 14, t, costume: 'hero', hold: 'sheaf' });
    figure(ctx, poses.reapA, { x: 1430, y: base, s: 420, id: 'r1', light: L, size: 11, t, costume: 'reaper', hold: 'scythe', cloth: false });
    figure(ctx, poses.reapB, { x: 1720, y: base, s: 300, id: 'r2', light: L, size: 9, t, costume: 'reaper2', hold: 'scythe', cloth: false, loose: true, haze: .25 });
  };
}
