#!/usr/bin/env python3
"""Score + foley + the announcer -> out/mix.wav. Everything reads timeline.json.
Run from the library root:  .venv/bin/python films/genz-fiskal/mix.py [--stems]

An original hot-dance band in B-flat, 200 BPM, written for this film (no quotation of existing tunes):
fanfare -> band (stops dead for "Tapi tunggu dulu") -> band -> a soft piano and clarinet under the Sritex photographs
-> band -> dead stop, timpani under the title card -> a march-like band for the cash book -> the duel (band = spending,
an old-time reel = revenue, trading bars, then half bars) -> soft band under Senayan, dead stop on the question ->
half-time piano and clarinet for the middle class -> march for August 2025 -> silence, one stab -> "da-DA!".
The state of the music is chosen per time range and gated with short fades, so a cut may fall inside a bar."""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf, soxr
from scipy.ndimage import maximum_filter1d, uniform_filter1d

HERE = Path(__file__).resolve().parent
LIB = HERE.parents[1]
sys.path.insert(0, str(LIB))
from core.audio import sampler as S, pluck as PL
from core.audio.sfx import SR, add, bp, lp, hp, noise, norm, env_exp, t_, whoosh, thump, click, compress, limit

TL = json.loads((HERE / "timeline.json").read_text())
HIT, DUR, SEC = TL["hits"], TL["dur"], {s["id"]: s for s in TL["secs"]}
B = TL["beat"]; BAR = TL["bar"]
S.seed(23)
N = int((DUR + .3) * SR)
M = S.midi
tt = t_(N / SR)
(HERE / "out").mkdir(exist_ok=True)

ev, plucks = [], []
def n(t, inst, p, d, v, pan=0, g=1.0): ev.append((t, inst, p, d, v, pan, g))
def render_take():
    global ev, plucks
    x = S.render(ev, dur=N / SR)
    for t_p, pre, ps, d, v, g_, pan in plucks:
        y = PL.strum(pre, ps, d, vel=v, spread=.012) if len(ps) > 1 else PL.pluck(pre, ps[0], d, v)
        add(x, y, t_p, g_, pan)
    ev, plucks = [], []
    return x
def gate(a, b, fade_in=.012, fade_out=.03):
    g = np.zeros(N, np.float32); i0, i1 = int(max(0, a) * SR), int(min(DUR, b) * SR); g[i0:i1] = 1
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    if i0 + fi < N: g[i0:i0 + fi] = np.linspace(0, 1, fi)
    if i1 - fo > 0: g[i1 - fo:i1] = np.linspace(1, 0, fo)
    return g[:, None]
bars_in = lambda a, b: range(int(np.floor(a / BAR + 1e-6)), int(np.ceil(b / BAR - 1e-6)))

# ------------------------------------------------------------------ material
CH = {'Bb': ['Bb', 'D', 'F'], 'F7': ['F', 'A', 'C', 'Eb'], 'G7': ['G', 'B', 'D', 'F'], 'C7': ['C', 'E', 'G', 'Bb'], 'Gm': ['G', 'Bb', 'D'], 'Eb': ['Eb', 'G', 'Bb']}
ROOT = {'Bb': 'Bb1', 'F7': 'F2', 'G7': 'G1', 'C7': 'C2', 'Gm': 'G1', 'Eb': 'Eb2'}
FIFTH = {'Bb': 'F2', 'F7': 'C2', 'G7': 'D2', 'C7': 'G1', 'Gm': 'D2', 'Eb': 'Bb1'}
PROG = ['Bb', 'Bb', 'F7', 'F7', 'Bb', 'G7', 'C7', 'F7']
MEL = [   # original 8-bar tune (beat, pitch, length in beats); the Charleston accent on 1 and the "and" of 2
    [(0, 'D5', .5), (.5, 'F5', .5), (1, 'Bb5', 1), (2.5, 'A5', .5), (3, 'F5', 1)],
    [(0, 'D5', 1.5), (1.5, 'C5', .5), (2, 'D5', .5), (2.5, 'F5', 1.5)],
    [(0, 'Eb5', .75), (1.5, 'C5', .75), (2.5, 'A4', .5), (3, 'C5', 1)],
    [(0, 'F5', 1.5), (1.5, 'Eb5', .5), (2, 'D5', .5), (2.5, 'C5', 1.5)],
    [(0, 'D5', .5), (.5, 'F5', .5), (1, 'Bb5', 1), (2.5, 'C6', .5), (3, 'Bb5', 1)],
    [(0, 'B4', .75), (1.5, 'D5', .75), (2.5, 'F5', .5), (3, 'G5', 1)],
    [(0, 'E5', .75), (1.5, 'G5', .75), (2.5, 'Bb5', .5), (3, 'G5', .5), (3.5, 'E5', .5)],
    [(0, 'F5', 1), (1, 'A4', .5), (1.5, 'C5', .5), (2, 'Eb5', 2)],
]
voicing = lambda ch, o: [f"{x}{o}" for x in CH[ch]]
def band_bar(bar, soft=1.0, pan=0.0, mel='open', snare=True, bones=True):
    t0 = bar * BAR; T = lambda k: t0 + k * B; ch = PROG[bar % 8]
    n(T(0), 'tuba_stac', ROOT[ch], .3, .85 * soft, pan - .05, .7); n(T(2), 'tuba_stac', FIFTH[ch], .3, .78 * soft, pan - .05, .7)
    for k in range(4): plucks.append((T(k), 'banjo', voicing(ch, 4)[:3], .28, (.75 if k % 2 else .55) * soft, .32, pan - .35))
    if snare:
        for k in (1, 3): n(T(k), 'snare', 'on', None, .32 * soft, pan + .15, .55)
    if bones:
        for k in (0, 1.5):
            for p in voicing(ch, 3)[:3]: n(T(k), 'trombone_stac', p, .2, .7 * soft, pan + .2, .42)
        for k in (1, 3):
            for p in voicing(ch, 4)[:2]: n(T(k), 'honky_tonk', p, .18, .5 * soft, pan + .3, .35)
    if mel:
        for b_, p, d in MEL[bar % 8]:
            if mel == 'mute': n(T(b_), 'trumpet_mute', p, d * B, .75 * soft, pan - .15, .9)
            else:
                n(T(b_), 'trumpet', p, d * B, .8 * soft, pan - .15, .75); n(T(b_), 'clarinet', M(p) - 9, d * B, .6 * soft, pan + .35, .5)
def soft_bar(bar, chords=('Gm', 'Eb', 'Bb', 'F7'), clar=True):
    """piano and clarinet, no drums: for the photographs of the Sritex workers"""
    t0 = bar * BAR; ch = chords[bar % 4]
    n(t0, 'tuba_stac', ROOT[ch], .5, .5, 0, .45)
    for p in voicing(ch, 3): n(t0, 'upright', p, 4 * B, .42, .1, .35)
    for p in voicing(ch, 4)[:2]: n(t0 + 2 * B, 'upright', p, 2 * B, .35, .1, .28)
    if clar:
        line = {'Gm': [(0, 'D5', 2), (2, 'Bb4', 2)], 'Eb': [(0, 'G4', 3), (3, 'Bb4', 1)], 'Bb': [(0, 'D5', 2), (2, 'F5', 2)], 'F7': [(0, 'Eb5', 2), (2, 'C5', 2)]}[ch]
        for b_, p, d in line: n(t0 + b_ * B, 'clarinet', p, d * B * .95, .55, .3, .6)
def half_bar(bar):
    """half-time: tuba on 1, piano on 2 and 4, banjo light, clarinet carries the tune an octave down"""
    t0 = bar * BAR; T = lambda k: t0 + k * B; ch = PROG[bar % 8]
    n(T(0), 'tuba_stac', ROOT[ch], .4, .7, 0, .6)
    for k in (1, 3):
        for p in voicing(ch, 4)[:3]: n(T(k), 'upright', p, .3, .45, .15, .32)
        plucks.append((T(k), 'banjo', voicing(ch, 4)[:3], .25, .45, .22, -.35))
    for b_, p, d in MEL[bar % 8]: n(T(b_), 'clarinet', M(p) - 12, d * B, .6, .3, .6)
def march_bar(bar):
    t0 = bar * BAR; T = lambda k: t0 + k * B; ch = PROG[bar % 8]
    for k in (0, 2): n(T(k), 'bass_drum', None, None, .7, 0, .55)
    for k in range(8): n(T(k * .5), 'snare', 'on', None, .22 + (.12 if k % 2 == 0 else 0), .15, .45)
    n(T(0), 'tuba_stac', ROOT[ch], .3, .85, 0, .7); n(T(2), 'tuba_stac', FIFTH[ch], .3, .8, 0, .7)
    for k in (1, 3):
        for p in voicing(ch, 3)[:3]: n(T(k), 'trombone_stac', p, .2, .7, .2, .42)
    for b_, p, d in MEL[bar % 8]: n(T(b_), 'trumpet', p, d * B, .8, -.15, .7)
RCH = {'F': ['F', 'A', 'C'], 'Bb': ['Bb', 'D', 'F'], 'C7': ['C', 'E', 'G', 'Bb']}
RROOT = {'F': ('F2', 'C2'), 'Bb': ('Bb1', 'F2'), 'C7': ('C2', 'G1')}
REEL = [('F', 'C5 F5 A5 F5 C5 F5 A5 C6'), ('Bb', 'D6 Bb5 F5 Bb5 D6 C6 Bb5 A5'), ('C7', 'G5 E5 C5 E5 G5 Bb5 G5 E5'), ('F', 'F5 - C5 - A4 - F5 -')]
def reel_bar(t0, i, pan=0.0):
    ch, line = REEL[i % 4]; T = lambda k: t0 + k * B; r, f = RROOT[ch]
    n(T(0), 'tuba_stac', r, .25, .8, pan, .6); n(T(2), 'tuba_stac', f, .25, .75, pan, .6)
    for k in (1, 3):
        for p in [f"{x}3" for x in RCH[ch]][:3]: n(T(k), 'upright', p, .16, .55, pan + .1, .3)
    notes = line.split()
    for j, p in enumerate(notes):
        if p == '-': continue
        d = .5 * B * (2 if j + 1 < len(notes) and notes[j + 1] == '-' else 1)
        n(T(j * .5), 'violin', p, d * .95, .62 + .12 * (j % 2 == 0), pan - .1, .8); n(T(j * .5), 'strumstick', M(p) - 12, .2, .5, pan + .3, .3)
def stab(t, chord=('D4', 'F4', 'Bb4'), bass='Bb1', crash=True):
    for p in chord: n(t, 'trumpet', p, .2, .85, 0, .5)
    for p in chord: n(t, 'trombone_stac', M(p) - 12, .2, .8, 0, .5)
    n(t, 'tuba_stac', bass, .3, .9)
    if crash: n(t, 'crash', None, None, .55, 0, .5)

music = np.zeros((N, 2), np.float32)
def state(a, b, fn, fade_in=.012, fade_out=.03, **kw):
    for bar in bars_in(a - BAR, b): fn(bar, **kw)
    music[:] += render_take() * gate(a, b, fade_in, fade_out)

# 1. fanfare
T0 = HIT['beams_on']
for k in range(8): n(k * .02, 'timpani', 'Bb1', .05, .25 + k * .06, 0, .8)
for b_, p, d in [(0, 'F4', .14), (.5, 'Bb4', .14), (1, 'D5', 1.4), (3, 'C5', .14), (3.5, 'D5', .14), (4, 'F5', 2.6)]:
    t = T0 + b_ * B; n(t, 'trumpet', p, d * B + .02, .85, -.25, .9); n(t, 'trumpet', M(p) - 4 if p != 'F5' else 'D5', d * B + .02, .7, .25, .55)
    n(t, 'trombone_stac' if d < .5 else 'trombone', M(p) - 12, d * B + .02, .75, .1, .7)
n(T0, 'tuba_stac', 'Bb1', .3, .9); n(T0 + 4 * B, 'tuba_stac', 'Bb1', .4, .9); n(T0, 'crash', None, None, .8, 0, .7)
n(T0 + 4 * B, 'timpani', 'Bb1', .6, .8); n(T0 + 4 * B, 'timpani', 'F2', .6, .6)
t2 = T0 + 8 * B
for p in ['G4', 'Bb4', 'Eb5']: n(t2, 'trumpet', p, .2, .7, 0, .45)
for p in ['F4', 'Bb4', 'D5']: n(t2 + 1.5 * B, 'trumpet', p, .6, .8, 0, .45)
n(t2 + 1.5 * B, 'tuba_stac', 'Bb1', .5, .9); n(t2 + 1.5 * B, 'timpani', 'Bb1', .9, .85); n(t2 + 2.5 * B, 'sus_cymbal', 'cresc', None, .5, 0, .4)
music += render_take()

# 2. the good news, then the dead stop for "Tapi tunggu dulu"
state(HIT['paper_fly'] - B, HIT['stop1'], band_bar, mel='mute', snare=True)
stab(HIT['stop1']); music += render_take()
# 3. back in, one beat before the chart flips (J-cut): the young, the job fair, informal work
state(HIT['chart_in'] - B, HIT['sritex_in'] - B, band_bar, fade_in=.03)
for i in range(6): n(HIT['six_in'] + .15 + i * B, 'woodblock', None, None, .55, .25, .5)
for k, p in (('ring_1737', 'D6'), ('star_sk', 'F6')): n(HIT[k], 'glockenspiel', p, .6, .7, .2, .55)
music += render_take()
# 4. the Sritex photographs: piano and clarinet, no drums
state(HIT['sritex_in'] - B, HIT['kem_in'] - B, soft_bar, fade_in=.25, fade_out=.2)
# 5. the figures, the map, the dead stop
state(HIT['kem_in'] - B, HIT['stop2'], band_bar, fade_in=.05)
stab(HIT['stop2'], ('C4', 'Eb4', 'G4'), 'C2')
for k in range(10): n(HIT['card_in'] - .5 + k * .05, 'timpani', 'F1', .06, .3 + k * .05, 0, .6)
n(HIT['card_in'], 'timpani', 'Bb1', 1.0, .85); n(HIT['card_in'] + 2 * B, 'timpani', 'F1', .9, .7)
for p in ['F3', 'Bb3', 'D4']: n(HIT['card_in'], 'trombone', p, 2.4, .5, 0, .35)
music += render_take()
# 6. the cash book: march
state(HIT['ledger_in'] - B, HIT['split_in'], march_bar, fade_in=.05)
# 7. the duel: spending (band, right) against revenue (reel, left), trading bars, then half bars, then beats
DUEL, t = [], HIT['split_in']
for dur_b, side in [(1, 'R'), (1, 'L'), (1, 'R'), (1, 'L'), (.5, 'R'), (.5, 'L'), (.5, 'R'), (.5, 'L'), (.25, 'R'), (.25, 'L'), (.25, 'R'), (.25, 'L')] * 2:
    if t >= HIT['stop3'] - 1e-6: break
    DUEL.append((t, min(t + dur_b * BAR, HIT['stop3']), side)); t += dur_b * BAR
for side in 'LR':
    for bar in bars_in(HIT['split_in'] - BAR, HIT['stop3']):
        if side == 'L': reel_bar(bar * BAR, bar, pan=-.7)
        else: band_bar(bar, pan=.7, mel='open')
    x = render_take(); g = np.zeros(N, np.float32)
    for a_, z_, sd in DUEL:
        if sd == side: g[int(a_ * SR):int(z_ * SR)] = 1
    music += x * uniform_filter1d(g, int(.012 * SR))[:, None]
stab(HIT['stop3'], ('Eb4', 'G4', 'C5'), 'C2'); music += render_take()
# 8. Senayan, soft; the question ends in a dead stop
state(HIT['dpr_in'] - B, HIT['stop4'], band_bar, fade_in=.05, soft=.6, snare=False, bones=False, mel='mute')
stab(HIT['stop4'], ('C4', 'E4', 'Bb4'), 'C2', crash=False); music += render_take()
# 9. the commute and the middle class: half time
state(HIT['krl_in'] - B, HIT['poster_in'] - B, half_bar, fade_in=.3)
for i in range(0, 57, 4): n(HIT['class_in'] + .2 + .5 + i * .045, 'woodblock', None, None, .35, -.2, .3)
n(HIT['ring_gap'], 'glockenspiel', 'Bb5', .6, .7, .2, .5)
music += render_take()
# 10. August 2025: march, then silence for the button
state(HIT['poster_in'] - B, HIT['button_in'], march_bar, fade_in=.05, fade_out=.04)
stab(HIT['freeze'], ('D4', 'F4', 'B4'), 'G1'); music += render_take()
# 11. ident reprise, "da-DA!", the end card
h1, h2 = HIT['end_hit1'], HIT['end_hit2']
for p in ['A4', 'Eb5', 'C6']: n(h1, 'trumpet', p, .16, .8, 0, .5)
for p in ['F3', 'Eb4', 'A4']: n(h1, 'trombone_stac', p, .2, .8, 0, .5)
n(h1, 'tuba_stac', 'F2', .2, .85); n(h1, 'snare', 'on', None, .6, 0, .5)
for p in ['D5', 'F5', 'Bb5']: n(h2, 'trumpet', p, 2.4, .9, 0, .5)
n(h2, 'clarinet', 'Bb5', 2.4, .7, .3, .5)
for p in ['Bb2', 'D3', 'F3', 'Bb3']: n(h2, 'trombone', p, 2.4, .8, 0, .45)
n(h2, 'tuba_stac', 'Bb1', .6, .9); n(h2, 'timpani', 'Bb1', 2.2, .9); n(h2, 'crash', None, None, .85, 0, .8)
for p in ['Bb3', 'D4', 'F4']: n(h2, 'honky_tonk', p, 1.5, .7, .3, .4)
for b_ in range(0, 8, 2): n(SEC['endlogo']['t0'] + b_ * B, 'timpani', 'F1' if b_ % 4 else 'Bb1', .3, .45, 0, .4)
EC = SEC['endcard']['t0']
for b_, p, d in [(0, 'F5', .5), (.5, 'D5', .5), (1, 'Bb4', .5), (1.5, 'D5', .5), (2, 'F5', 1.5), (4, 'Bb5', 6)]: n(EC + .2 + b_ * B, 'clarinet', p, d * B, .55, .2, .45)
for p in ['Bb2', 'D3', 'F3', 'A3']: n(EC + .2 + 4 * B, 'trombone', p, 6 * B, .45, 0, .3)
plucks.append((EC + .2 + 4 * B, 'banjo', ['Bb3', 'D4', 'F4', 'Bb4'], 1.2, .6, .22, -.35))
music += render_take()
music = S.room(music, size=.28, mix=.12)

# ------------------------------------------------------------------ foley
fx = np.zeros((N, 2), np.float32)
def arc(v=1.0):
    d = .5; x = hp(noise(d), 2000) * env_exp(d, .006) + bp(noise(d), 3000, 9000) * env_exp(d, .12) * .25; return norm(x) * v
def long_whoosh(d, v=1.0):
    tq = t_(d); out = np.zeros(len(tq)); nz = noise(d)
    for i in range(0, len(tq), 480):
        f = 400 + 2600 * (i / len(tq)) ** 1.6; hi = min(len(tq), i + 480); out[i:hi] = bp(nz[max(0, i - 2000):hi], f * .7, f * 1.4)[-(hi - i):]
    flutter = .55 + .45 * np.abs(np.sin(2 * np.pi * np.cumsum(3 + 9 * tq / d) / SR)); return norm(out * flutter * (tq / d) ** 1.4) * v
def paper_slap(v=1.0): d = .25; return norm(bp(noise(d), 500, 6000) * env_exp(d, .03)) * v
def flap(v=1.0): d = .3; tq = t_(d); return norm(bp(noise(d), 800, 5000) * (np.abs(np.sin(2 * np.pi * 14 * tq)) ** 2) * env_exp(d, .1)) * v
def flick(v=1.0): d = .07; return norm(bp(noise(d), 1500, 7000) * env_exp(d, .015)) * v
def shutter(v=1.0):
    a = click(1.4, 1); out = np.zeros(int(.09 * SR)); out[:len(a)] += a[:len(out)]; b_ = click(1.1, .7); j = int(.045 * SR); out[j:j + len(b_)] += b_[:len(out) - j]; return norm(out) * v
def pencil_sq(d, v=1.0):
    tq = t_(d); f = 1800 + 500 * np.sin(2 * np.pi * 7 * tq); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (.4 + .6 * (np.sin(2 * np.pi * 23 * tq) > 0))
    x = bp(noise(d), 1500, 6000) * .6 + tone * .25; return norm(x * np.minimum(1, np.minimum(tq / .02, (d - tq) / .03))) * v
def lead(d, v=1.0):
    x = bp(noise(d), 2500, 9000) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 31 * t_(d)))); return norm(x * np.minimum(1, np.minimum(t_(d) / .02, (d - t_(d)) / .02))) * v
def ticker(d, v=1.0):
    out = np.zeros(int(d * SR)); r = np.random.default_rng(3); t = 0
    while t < d - .03:
        c = click(1.8 + r.random() * .3, 1); i = int(t * SR); out[i:i + len(c)] += c[:len(out) - i]; t += r.choice([.045, .045, .09, .135])
    return norm(bp(out, 900, 6000)) * v
def stamp_snd(v=1.0):
    x = np.zeros(int(.3 * SR)); a = thump(1, 120); x[:min(len(a), len(x))] += a[:len(x)]; b_ = paper_slap(.6); x[:min(len(b_), len(x))] += b_[:len(x)] * .6
    return norm(x) * v
def typewriter(d, v=1.0):
    out = np.zeros(int(d * SR)); r = np.random.default_rng(9); t = 0
    while t < d - .03:
        c = click(1.3 + r.random() * .4, 1); i = int(t * SR); out[i:i + len(c)] += c[:len(out) - i]; t += .07 + r.random() * .05
    return norm(bp(out, 600, 5000)) * v
sec = lambda k: SEC[k]['t0']
add(fx, arc(.6), HIT['beams_on'], .9)
for nm, fly, slam in (('p1', HIT['paper_fly'], HIT['paper_slam']), ('p2', sec('poster') - .05, sec('poster') + 1.0)):
    add(fx, long_whoosh(slam - fly - .05, .8), fly + .02, .7); add(fx, thump(1, 85), slam, .75); add(fx, paper_slap(.8), slam, .8)
add(fx, pencil_sq(.3, .7), HIT['ul_465'], .32, .1)
add(fx, thump(.8, 80), HIT['stop1'], .45)
add(fx, flap(.8), HIT['chart_in'] - .14, .6, .2)
add(fx, pencil_sq(.3, .7), HIT['ring_1737'], .32, .2); add(fx, pencil_sq(.3, .7), HIT['six_ring'], .3, .2)
add(fx, stamp_snd(.8), HIT['six_ring'] + .3, .45)
add(fx, whoosh(.36, .8), HIT['wipe_jf'] - .17, .6, -.3)
for k, T in enumerate([sec('informal') + .12] + [HIT['inf_deal'] + i * B * 2 for i in range(3)]): add(fx, shutter(.7), T - .02, .35, (k - 1.5) * .2); add(fx, paper_slap(.5), T, .4)
add(fx, stamp_snd(.9), HIT['stamp_inf'], .55)
add(fx, paper_slap(.7), sec('factory') + .12, .5); add(fx, whoosh(.3, .6), sec('map1') - .02, .4)
add(fx, ticker(max(.2, HIT['star_sk'] - sec('map1') - .3), .7), sec('map1') + .3, .3, -.2)
add(fx, paper_slap(.7), sec('sritex') + .12, .5); add(fx, whoosh(.3, .5), HIT['print2'] - .25, .35, .4)
add(fx, typewriter(.6, .7), HIT['tele_slam'] - .7, .25); add(fx, paper_slap(.8), HIT['tele_slam'], .5)
add(fx, flap(.6), sec('kemnaker'), .4); add(fx, stamp_snd(.9), HIT['ring_1354'] - .05, .5); add(fx, pencil_sq(.3, .7), HIT['ring_1354'], .3)
add(fx, whoosh(.4, .7), sec('map2') - .18, .5, .3)
for j in range(5):
    for i in range(3): add(fx, click(1.6, 1), sec('map2') + .3 + (j * 3 + i) * B, .12, -.3 + j * .15)
add(fx, paper_slap(.7), sec('pailit') + .12, .5); add(fx, thump(.8, 80), HIT['stop2'], .45); add(fx, pencil_sq(.3, .6), HIT['stop2'] + .1, .3)
for i in range(12): add(fx, flick(.6), sec('card') + .02 + i * .02, .22, -.2 + i * .03)
add(fx, thump(.9, 75), sec('ledger') + .12, .6); add(fx, paper_slap(.6), sec('ledger') + .12, .55)
for k in ('row_total', 'mbg_in', 'ul_bunga'): add(fx, lead(.3, .6), HIT[k], .25)
add(fx, lead(.3, .7), HIT['ul_total'] + .3, .3); add(fx, lead(.3, .7), HIT['ul_bunga'], .3); add(fx, pencil_sq(.3, .7), HIT['ring_lima'], .32)
add(fx, whoosh(.32, .7), HIT['split_in'] - .02, .5, .5); add(fx, stamp_snd(1), HIT['stamp_def'], .6); add(fx, pencil_sq(.25, .7), HIT['batas'], .3)
add(fx, thump(.8, 80), HIT['stop3'], .45); add(fx, whoosh(.3, .6), sec('dpr'), .45, -.4); add(fx, thump(.8, 80), HIT['stop4'], .45)
add(fx, pencil_sq(.3, .7), HIT['ring_gap'], .32); add(fx, stamp_snd(.9), HIT['calon'] - .05, .5)
add(fx, thump(1, 85), HIT['poster_slam'], .7); add(fx, paper_slap(.8), HIT['poster_slam'], .7); add(fx, stamp_snd(1), HIT['stamp_stop'], .6)
add(fx, thump(.9, 80), HIT['freeze'], .55); add(fx, pencil_sq(.35, .7), HIT['freeze'] + .25, .32)
add(fx, whoosh(.3, .5), sec('endlogo') - .3, .35)
claw = (np.abs(np.sin(np.pi * 24 * tt)) ** 18)
bed = bp(noise(N / SR), 1500, 5000) * claw * .5 + hp(lp(noise(N / SR), 260), 110) * .12 + hp(noise(N / SR), 5000) * .08
bed = norm(bed) * .05 * np.minimum(1, tt / .3)
fx[:, 0] += bed; fx[:, 1] += bed * .95

# ------------------------------------------------------------------ the announcer: the user's take, treated as a 1930 optical track
def period_voice(x):
    x = hp(x, 260, 2); x = lp(x, 3700, 3)
    x = x + .55 * bp(x, 1500, 2300, 2)
    x = np.tanh(norm(x) * 2.0) / np.tanh(2.0)
    x = compress(x, thr=.3, ratio=4)
    k = np.arange(len(x), dtype=np.float64)
    dev = .0022 * np.sin(2 * np.pi * .55 * k / SR) + .0007 * np.sin(2 * np.pi * 6.3 * k / SR)
    x = np.interp(np.clip(k + np.cumsum(dev), 0, len(x) - 1), k, x).astype(np.float32)
    y = x.copy(); d1, d2 = int(.031 * SR), int(.067 * SR); y[d1:] += x[:-d1] * .16; y[d2:] += lp(x, 2500)[:-d2] * .09
    return y
clips = {}
for L in TL["lines"]:
    x, sr = sf.read(HERE / "voice" / "out" / f"{L['id']}.wav", dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    clips[L['id']] = soxr.resample(x, sr, SR)
peak = max(np.abs(period_voice(c)).max() for c in clips.values())   # one gain for the whole take keeps the read's dynamics
vo = np.zeros((N, 2), np.float32)
for L in TL["lines"]: add(vo, period_voice(clips[L['id']]) / peak * .9, L['t'], 1.0)
if "--clean" in sys.argv:   # the untreated voice in film time, for the speech check
    cl = np.zeros(N, np.float32)
    for L in TL["lines"]: i = int(L['t'] * SR); c = clips[L['id']]; cl[i:i + len(c)] += c[:N - i]
    sf.write(HERE / "out" / "vo_clean.wav", cl[:int(DUR * SR)], SR)

env = (np.abs(vo[:, 0]) > .02).astype(np.float32)
env = uniform_filter1d(maximum_filter1d(env, int(.18 * SR)), int(.12 * SR))
mus = music * (1 - .42 * env)[:, None]
for c in range(2):
    y = bp(mus[:, c], 95, 7500, 2); y = y - .65 * lp(y, 150, 2); mus[:, c] = np.tanh(y * 1.6) / 1.6
    fx[:, c] = hp(fx[:, c], 55, 2)
mus *= .5 / (np.percentile(np.abs(mus[mus != 0]), 99.5) + 1e-9)
mix = mus * .43 + fx * .85 + vo * 1.05
for c in range(2): mix[:, c] = limit(mix[:, c], .95)
(HERE / "out").mkdir(exist_ok=True)
sf.write(HERE / "out" / "mix.wav", mix[:int(DUR * SR)], SR)
if "--stems" in sys.argv:
    for nm, x in (("music", mus), ("fx", fx), ("vo", vo)): sf.write(HERE / "out" / f"stem_{nm}.wav", x[:int(DUR * SR)], SR)
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
vm = np.abs(vo[:, 0]) > .02
print("voice rms", round(rms_db(vo[vm, 0] * 1.05), 1), "| music under voice", round(rms_db(mus[vm, 0] * .43), 1), "| band (no voice)", round(rms_db(mus[(~vm), 0] * .43), 1))
