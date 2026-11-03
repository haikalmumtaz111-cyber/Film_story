# Score for "The Last Field": a 1960s roadshow overture in miniature. 96 BPM, 4/4, D minor → D major.
# Horns and low brass, timpani, a spiccato string ostinato, snare; one high violin in the silence. Same grid as timeline.js.
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, ROOT)
import numpy as np, soundfile as sf
from core.audio import sampler as S
from core.audio.sfx import SR, limit

S.seed(7)
BPM = 96; B = 60 / BPM; BAR = 4 * B
at = lambda bar, beat=1: (bar - 1) * BAR + (beat - 1) * B
DUR = at(17) + .5
E = []
def n(t, inst, p, d, v, pan=0, g=1): E.append((t, inst, p, d, v, pan, g))

# ---- 1 (bars 1-2): the storm wall. Timpani roll swelling on D, low string pedal, the horn call D-A-D
for i in range(int(BAR * 2 / (B / 4))):
    t = i * B / 4; v = .18 + .5 * (t / (BAR * 2))
    if t < at(2, 4): n(t, 'timpani', 'D2', B / 4, v, -.1, .8)
n(0, 'contrabass', 'D2', BAR * 2, .45, .2); n(0, 'cellos', 'D3', BAR * 2, .4, .25)
n(at(1, 1.5), 'horn', 'D4', B * 1.5, .7, -.25); n(at(1, 3), 'horn', 'A4', B * 2, .75, -.25)
n(at(2, 1), 'horn', 'D5', B * 3, .8, -.25); n(at(2, 1), 'horn', 'A4', B * 3, .55, -.15); n(at(2, 1), 'trombone', 'D3', B * 3, .5, .1)
n(at(2, 4), 'timpani', 'A2', B, .7, -.1)

# ---- 2 (bars 3-4): the call. Ostinato enters on the arm hit (bar 3 beat 3)
OST = ['D3', 'D3', 'A2', 'D3', 'F3', 'D3', 'A2', 'D3']
def ostinato(b0, b1, v=.55, inst='cellos_spic'):
    t = b0
    i = 0
    while t < b1 - 1e-6:
        acc = 1.0 if i % 4 == 0 else .82
        n(t, inst, OST[i % 8], B / 2 * .9, v * acc, .3)
        t += B / 2; i += 1
n(at(3, 3), 'timpani', 'D2', B, .95, -.1); n(at(3, 3), 'bass_drum', None, None, .7, 0, .8)
n(at(3, 3), 'trombone', 'D3', B * 2, .7, .1); n(at(3, 3), 'tuba', 'D2', B * 2, .6, .15); n(at(3, 3), 'horn', 'F4', B * 2, .65, -.2); n(at(3, 3), 'horn', 'A4', B * 2, .65, -.25)
ostinato(at(3, 3), at(5))
n(at(3, 3), 'contrabass_pizz', 'D2', B, .8, .2); n(at(4, 1), 'contrabass_pizz', 'D2', B, .8, .2); n(at(4, 3), 'contrabass_pizz', 'A1', B, .8, .2)
n(at(4, 1), 'horn', 'D4', B * 2, .6, -.25); n(at(4, 3), 'horn', 'E4', B, .6, -.25); n(at(4, 4), 'horn', 'F4', B, .65, -.25)

# ---- 3 (bars 5-7): the work. Ostinato, snare eighths, trombone stabs on the scythe strikes (beats 1 and 3)
ostinato(at(5), at(7, 3), .62)
CH = {5: ('D3', 'F3', 'A3', 'D2'), 6: ('Bb2', 'D3', 'F3', 'Bb1'), 7: ('C3', 'E3', 'G3', 'C2')}
for bar in (5, 6, 7):
    a, b, c, bass = CH[bar]
    for beat in (1, 3):
        if bar == 7 and beat == 3: continue
        t = at(bar, beat)
        n(t, 'trombone_stac', a, B * .6, .85, .15); n(t, 'trombone_stac', b, B * .6, .75, .05); n(t, 'horn_stac', c, B * .6, .7, -.2)
        n(t, 'tuba_stac', bass, B * .6, .75, .1); n(t, 'timpani', 'D2' if bar == 5 else ('A1' if bar == 6 else 'C2'), B, .7, -.1)
    for k in range(8):
        n(at(bar, 1 + k / 2), 'snare', None, None, .55 if k % 2 == 0 else .3, -.05, .55)
# bar 7: the sky closes. Violin tremolo high, the bolt on beat 3 (timpani + gong + crash), then everything drops away
n(at(7), 'violins_trem', 'D5', BAR * .5, .45, -.3); n(at(7), 'violins_trem', 'F5', BAR * .5, .4, .3)
n(at(7, 3), 'timpani', 'D2', B * 2, 1.0, -.1); n(at(7, 3), 'gong', None, None, .7, 0, .9); n(at(7, 3), 'crash', None, None, .65, .2, .6)
n(at(7, 3), 'contrabass', 'D1', B * 2, .6, .2); n(at(7, 3), 'trombone', 'D2', B * 1.5, .7, .1)

# ---- 4 (bars 8-10): near silence. One violin, high and soft; it stops before the drop
n(at(8, 2), 'violin', 'A5', BAR * 2.2, .22, -.2)
n(at(9, 3), 'violin', 'G5', BAR * .9, .18, -.2)
n(at(8, 1), 'contrabass', 'D1', BAR * 2.4, .16, .2)

# ---- 5 (bars 11-13): the last sheaf. Ostinato returns with timpani; the breath (bar 12 beat 1 rest); the lift is the tutti
ostinato(at(11), at(12), .6)
n(at(11), 'timpani', 'D2', B, .8, -.1); n(at(11, 3), 'timpani', 'A1', B, .8, -.1)
for i in range(8): n(at(11, 3) + i * B / 4, 'snare', None, None, .2 + i * .05, -.05, .5)
n(at(11), 'horn', 'D4', B, .7, -.25); n(at(11, 2), 'horn', 'F4', B, .72, -.25); n(at(11, 3), 'horn', 'A4', B * 1.5, .78, -.25)
# breath: nothing on bar 12 beat 1. Lift on beat 2: F major tutti
t = at(12, 2)
for p in ('F3', 'A3', 'C4', 'F4'): n(t, 'horn', p, BAR * 1.3, .85, -.2)
for p in ('F2', 'C3', 'A3'): n(t, 'trombone', p, BAR * 1.3, .8, .1)
n(t, 'tuba', 'F1', BAR * 1.3, .75, .15); n(t, 'trumpet', 'C5', B * 1.5, .85, .05); n(t, 'trumpet', 'A4', B * 1.5, .75, .0)
n(t, 'violins', 'F5', BAR * 1.3, .7, -.3); n(t, 'violins', 'C5', BAR * 1.3, .6, -.25); n(t, 'violas', 'A4', BAR * 1.3, .6, .0); n(t, 'cellos', 'F3', BAR * 1.3, .7, .25); n(t, 'contrabass', 'F2', BAR * 1.3, .7, .25)
n(t, 'timpani', 'F2', B * 2, 1.0, -.1); n(t, 'crash', None, None, .8, .2, .7); n(t, 'bass_drum', None, None, .8, 0, .8)
# the theme on trumpet over Bb - C - F
MEL = [(12, 3.5, .5, 'D5'), (12, 4, 1, 'F5'), (13, 1, 1.5, 'E5'), (13, 2.5, .5, 'D5'), (13, 3, 1, 'C5'), (13, 4, 1, 'A4')]
for bar, beat, d, p in MEL: n(at(bar, beat), 'trumpet', p, d * B * .95, .82, .05)
n(at(13), 'horn', 'Bb3', B * 2, .7, -.2); n(at(13), 'horn', 'D4', B * 2, .7, -.2); n(at(13, 3), 'horn', 'C4', B * 2, .7, -.2); n(at(13, 3), 'horn', 'E4', B * 2, .7, -.2)
n(at(13), 'trombone', 'Bb2', B * 2, .7, .1); n(at(13, 3), 'trombone', 'C3', B * 2, .7, .1); n(at(13), 'tuba', 'Bb1', B * 2, .65, .15); n(at(13, 3), 'tuba', 'C2', B * 2, .65, .15)
n(at(13), 'violins_trem', 'D5', BAR, .5, -.3); n(at(13), 'cellos', 'Bb2', B * 2, .6, .25); n(at(13, 3), 'cellos', 'C3', B * 2, .6, .25)
for i in range(16): n(at(13, 1) + i * B / 4, 'timpani', 'C2', B / 4, .25 + i * .035, -.1, .8)   # roll into the whip

# ---- 6 (bars 14-16): whip out; the title letters on a rising glockenspiel; the D major chord at bar 15
n(at(14), 'crash', None, None, .45, 0, .5)
SCALE = ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'E6', 'F#6', 'G6', 'A6']
k = 0
for i, ch in enumerate('THE LAST FIELD'):
    if ch == ' ': continue
    n(at(14, 3) + i * B / 4, 'flute_stac', SCALE[k % len(SCALE)].replace('6', '5'), B / 3, .6, .15); k += 1
    n(at(14, 3) + i * B / 4, 'violins_pizz', SCALE[k % len(SCALE)].replace('6', '5'), B / 2, .35, -.2)
for i in range(16): n(at(14) + i * B / 4, 'snare', None, None, .15 + i * .03, -.05, .5)
t = at(15)
for p in ('D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'): n(t, 'horn', p, BAR * 2, .85, -.2)
for p in ('D2', 'A2', 'F#3'): n(t, 'trombone', p, BAR * 2, .8, .1)
n(t, 'tuba', 'D1', BAR * 2, .75, .15); n(t, 'trumpet', 'D5', BAR * 1.6, .85, .05); n(t, 'trumpet', 'A4', BAR * 1.6, .78, 0); n(t, 'trumpet', 'F#4', BAR * 1.6, .7, 0)
n(t, 'violins', 'D6', BAR * 2, .65, -.3); n(t, 'violins', 'A5', BAR * 2, .6, -.25); n(t, 'violas', 'F#4', BAR * 2, .6, 0); n(t, 'cellos', 'D3', BAR * 2, .7, .25); n(t, 'contrabass', 'D2', BAR * 2, .75, .25)
n(t, 'crash', None, None, .85, .2, .75); n(t, 'gong', None, None, .7, -.1, .8); n(t, 'bass_drum', None, None, .85, 0, .8)
for i in range(int(BAR * 1.5 / (B / 4))): n(t + i * B / 4, 'timpani', 'D2', B / 4, .7 - i * .02, -.1, .8)
n(t + BAR * 1.5, 'timpani', 'D2', B * 3, .85, -.1)

E = [e for e in E if e[4] > 0]
mix = S.render(E, dur=DUR)
mix = S.room(mix, size=.55, mix=.2)
mix = limit(mix, .9)
sf.write(os.path.join(HERE, 'score.wav'), mix.astype(np.float32), SR)
print('score.wav', round(len(mix) / SR, 2), 's')
