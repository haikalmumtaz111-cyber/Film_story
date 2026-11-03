# Sound design + final mix for "The Last Field": wind over wheat, cloth, scythes, sheaves, thunder, one drop, rain.
# Reads the page's events (events.json from core/render/events.mjs) and the score; writes out/mix.wav.
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, ROOT)
import numpy as np, soundfile as sf
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, thump, whoosh, rumble, add, limit, compress

rng = np.random.default_rng(5)
EVJ = json.load(open(os.path.join(HERE, 'events.json')))
DUR, EV = EVJ['dur'], EVJ['ev']
N = int((DUR + .2) * SR)
music, _ = sf.read(os.path.join(HERE, 'music/score.wav'))
music = music[:N] if len(music) >= N else np.pad(music, ((0, N - len(music)), (0, 0)))
fx = np.zeros((N, 2)); amb = np.zeros((N, 2))
T = {e['type']: e['t'] for e in EV}
tl = np.arange(N) / SR
def put(buf, x, at, g=1., pan=0.): add(buf, x, at, g, pan)
def envelope(points):   # [(t, level)] → per-sample curve
    ts, vs = zip(*points); return np.interp(tl, ts, vs)

# ---------- materials
def flap(v=1.):            # cloth snapping in a gust: a burst of low-mid noise with flutter
    d = .5; tt = t_(d); fl = .6 + .4 * np.sign(np.sin(2 * np.pi * 17 * tt))
    return norm(bp(noise(d), 180, 1600) * env_exp(d, .12) * fl) * v
def snap(v=1.):            # the shawl cracking taut on the call
    d = .3; x = bp(noise(d), 400, 3500) * env_exp(d, .03) + bp(noise(d), 120, 500) * env_exp(d, .08) * .6
    return norm(x) * v
def scythe(v=1.):          # swish through stalks + the blade's thin ring
    d = .7; tt = t_(d)
    sw = bp(noise(d), 1500, 7000) * np.sin(np.pi * np.clip(tt / .28, 0, 1)) ** 2 * (tt < .28)
    stalks = hp(noise(d), 2500) * env_exp(d, .05) * (rng.random(len(tt)) < .02) * 4
    ring = sum(a * np.sin(2 * np.pi * f * tt) for f, a in [(2650, 1), (4120, .5), (5900, .25)]) * env_exp(d, .18) * (tt > .2)
    return norm(sw * .9 + stalks * .3 + ring * .12) * v
def rustle(d=.5, v=1.):    # dry straw
    x = hp(noise(d), 1800) * (rng.random(int(round(d * SR))) < .25) * env_exp(d, d / 3)
    return norm(x + bp(noise(d), 600, 3000) * env_exp(d, d / 4) * .4) * v
def land(v=1.):            # a sheaf landing on the heap: soft thump + rustle
    x = np.zeros(int(.6 * SR)); th = thump(.8, 85); x[:len(th)] += th[:len(x)]; r = rustle(.5); x[:len(r)] += r * .7
    return norm(x) * v
def thunder(v=1.):
    d = 4.5; tt = t_(d)
    crack = bp(noise(d), 300, 5000) * env_exp(d, .08) * .8
    roll = lp(noise(d), 160) * (np.exp(-tt / 1.6) * (1 - np.exp(-tt / .15))) * 3
    return norm(crack + roll + rumble(d, .8)[:len(tt)] * .5) * v
def drop(v=1.):            # one fat drop on skin: a soft tick and a tiny plink
    d = .25; tt = t_(d); fr = 1400 * (1 + 1.0 * np.exp(-tt / .01))
    return norm(np.sin(2 * np.pi * np.cumsum(fr) / SR) * env_exp(d, .03) + hp(noise(d), 4000) * env_exp(d, .004) * .5) * v
def whipS(v=1., d=.4): return norm(bp(noise(d), 500, 6000) * np.sin(np.pi * np.clip(t_(d) / d, 0, 1)) ** 3) * v
def breath(v=1.):          # an intake of breath before the lift
    d = .55; tt = t_(d); return norm(bp(noise(d), 700, 3500) * np.sin(np.pi * tt / d) ** 2) * v

# ---------- ambience: wind over wheat (gusting), rain from the turn
gusts = [(0, .55), (.6, .6), (1.2, 1.0), (2.5, .7), (5, .7), (T['snap'], 1.0), (T['snap'] + .6, .7), (10, .75), (17.3, .6), (17.9, .07), (24.2, .07), (24.6, .4), (25, .6), (T['lift'], .9), (T['lift'] + 2, .55), (40, .35)]
g = envelope(gusts)
w = noise(N / SR)[:N]
wind = bp(w, 120, 900) * .8 + bp(noise(N / SR)[:N], 1200, 4500) * .35 * g   # body + wheat hiss
wind *= g * (1 + .25 * np.sin(2 * np.pi * .23 * tl) * np.sin(2 * np.pi * .07 * tl))
amb[:, 0] += norm(wind) * .17; amb[:, 1] += norm(np.roll(wind, 2400)) * .17
rk = envelope([(0, 0), (T['rain'], 0), (T['rain'] + .5, .25), (T['lift'], .45), (T['whipout'], .5), (40, .3)])
rn = hp(noise(N / SR)[:N], 2500) * .6 + bp(noise(N / SR)[:N], 600, 2500) * .3
amb[:, 0] += norm(rn) * rk * .18; amb[:, 1] += norm(np.roll(rn, 777)) * rk * .18

# ---------- foley on the events
for e in EV:
    t, ty, a = e['t'], e['type'], e.get('amt', 1)
    if ty == 'gust': put(fx, whoosh(1.2, .7), t, .25, .3)
    elif ty == 'flap': put(fx, flap(.9), t, .32 * a, .35); put(fx, flap(.7), t + .45, .22, .4)
    elif ty == 'wipe': put(fx, flap(1.), t, .45, -.4); put(fx, whipS(.8, .45), t, .25, .4)
    elif ty == 'cloth': put(fx, flap(.6), t, .2, .2)
    elif ty == 'snap': put(fx, snap(1.), t, .5, .25)
    elif ty == 'scythe': put(fx, scythe(1.), t - .12, .38 * a, e.get('pan', 0))
    elif ty == 'whip': put(fx, whipS(1., .4), t, .42, .5)
    elif ty == 'toss': put(fx, whoosh(.45, .7), t, .3, -.5); put(fx, rustle(.35), t, .2, -.4)
    elif ty == 'land': put(fx, land(1.), t, .45, .1)
    elif ty == 'thunder': put(fx, thunder(1.), t, .85, -.1)
    elif ty == 'rumble': put(fx, thunder(1.), t, .1 * a, -.3)
    elif ty == 'drop': put(fx, drop(1.), t, .6, -.15)
    elif ty == 'breath': put(fx, breath(1.), t - .35, .22, -.1)
    elif ty == 'lift': put(fx, rustle(.8), t, .4, .2); put(fx, flap(1.), t + .05, .35, .3)
    elif ty == 'whipout': put(fx, whipS(1., .6), t - .05, .5, 0)

# ---------- mix: music ducks a little under the drop, the thunder and the silence stays a silence
duck = envelope([(0, 1), (T['thunder'] - .05, 1), (T['thunder'], .7), (T['thunder'] + 1.2, 1), (T['drop'] - .1, 1), (T['drop'], .75), (T['drop'] + .8, 1), (40, 1)])
mix = music * duck[:, None] * 1.3 + fx * 1.0 + amb
mix = np.stack([compress(mix[:, i], thr=.5, ratio=2.5) for i in range(2)], 1)
mix = limit(mix, .92)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out/mix.wav'), mix.astype(np.float32), SR)
print('out/mix.wav', round(len(mix) / SR, 2), 's')
