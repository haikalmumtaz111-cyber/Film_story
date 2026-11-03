# Terpning Epic Poster Gouache — our demo

One example among many. Don't reuse its story, arc, shots, props or timings.

Demo: *The Last Field* (40 s) · `terpning-poster.mp4` · source in [`demo/`](demo/)

## Story & structure

A storm wall rolls over a wheat steppe at sundown and one field is still standing. A young harvester calls her village to it; scythes swing on the beat, sheaves fly onto the wagon, the cloud eats the sun. In the silence she looks up and the first drop hits her cheek. Then she lifts the last sheaf from the top of the heap, the sun breaks under the cloud's edge, and the camera whips out: the moment is now a painted poster, and the title is lettered into the field.

Arc: threat (the wall) → the call (one gesture) → acceleration (work montage) → silence (the sky closes) → the turn (the lift, the light) → the event becomes the image (the poster).

Wordless: music, foley and two taglines carry it, so there is no `.srt`. Native moves spent: the gesture on the beat (shot 2), cloth as transition (the shawl crosses the lens twice), light breaks under the cloud (shot 7), the receding crowd (shots 1, 3), the frame becomes the poster (shot 8).

## Shots

| # | Time | Shot | Camera | Native move / note |
|---|---|---|---|---|
| 1 | 0–5.0 | Low wide: storm wall, low sun, the hero small and centred on a rise, four reapers | slow truck right + push 1.0 → 1.07, five parallax layers | gust at 1.2 s; tagline THE STORM COMES AT SUNDOWN / 风暴日落时到 |
| 2 | 5.0–10.0 | Low medium-full: the hero, pointing arm | locked, bounce on the hit (6.25) | arm hangs, dips (5.63), snaps up past the line and settles; tagline ONE FIELD LEFT / 只剩最后一块地 low left |
| 3 | 10.0–12.5 | Three reapers on a receding diagonal (520 / 360 / 240 px) | lateral drift | scythes strike on beats 1 and 3; whip out to the right |
| 4 | 12.5–15.0 | The wagon and its heap | whip in, tilt up | two sheaves arc in and land with a bounce (12.81, 14.06); whip out upward |
| 5 | 15.0–17.5 | The sky: the wall slides over the sun | whip in, push | lightning at 16.25 (bolt + flash) |
| 6 | 17.5–25.0 | Her profile against the dark sky | slow push 1.0 → 1.7, camera lowering | near silence; the drop lands on her cheek at 24.38 |
| 7 | 25.0–32.5 | Low full: the hero on the heap, crew below | push 1.22 → 1.34 | breath at 27.5, the lift at 28.13 (arm from the hip, overshoot, settle); the warm light breaks, rain starts |
| 8 | 32.5–40.0 | The same painting as a poster | whip out 1.34 → 0.68 with brush blur, spring settle | board edge draws in; title letters bounce in on sixteenths from 33.75; billing at 35.0 |

## Score structure

96 BPM, 4/4, bar = 2.5 s, D minor → D major. Bars 1–2: timpani roll swelling on D, low string pedal, horn call D–A–D. Bars 3–4: tutti hit on the arm (bar 3 beat 3), then a spiccato cello ostinato (D D A D F D A D in eighths) with pizzicato bass. Bars 5–7: ostinato, snare eighths, trombone/horn/tuba stabs on beats 1 and 3 over Dm – B♭ – C; bar 7 violin tremolo, the bolt = timpani + gong + crash. Bars 8–10: near silence (one high violin, a soft bass pedal; it stops before the drop). Bar 11: ostinato returns, timpani, horn phrase D–F–A. Bar 12 beat 1: a beat of rest (the breath); beat 2: F major tutti on the lift, trumpet theme over B♭ – C. Bar 13: timpani roll into the whip. Bars 14–16: suspended crash on the whip, rising flute staccato on each title letter, D major tutti at bar 15 ringing to the end.

Mix: wind bed gusting from one envelope (down to a whisper in the silence), rain from the turn, cloth flaps and snaps, scythe swishes with a blade ring, sheaf thumps, thunder; music ducks under the thunder and the drop. Sections measure about −30 dB RMS in the breath and −10 dB in the tuttis; master −14 LUFS.

## Palette & props

Sky `#1F4D97` → `#A9C3D6` → cream at a sun low on the right; storm body cobalt-violet with warm `#E6C49A` lit edges; wheat from `#EEC27A` (far, hazed toward violet) to deep ochre near; costumes in ochre-red, umber and violet. The hero: cream blouse, umber-red bodice, brown skirt, a red-ochre shawl (`#B5452B`, the purest chroma in the film), dark hair in a knot. Crew: straw hats, cream and ochre shirts, violet skirts. Props: scythes, sheaves (bundle, band, ragged ear fan), a hay wagon with a heap.

## End card

The poster itself: THE LAST FIELD / 最后一块麦田 lettered into the field, billing TERPNING EPIC POSTER GOUACHE · 史诗海报水粉 and the `LemoLab × Claude` sign-off, inside the board's cream edge; held 5 s. The sign-off belongs to this library's demo only; a user's film carries no LemoLab credit and no copy of this card.

## Build notes

`sh styles/terpning-poster/demo/build.sh` (or `LIB=<library> sh demo/build.sh`): fonts (`tools/fetch_fonts.sh`), events (`events.json`), score (`music/score.py`, needs `sh tools/fetch.sh instruments vsco2ce`), mix (`mix.py`), picture (4 workers, about 4 minutes on a 4-core Linux box with software rendering; the page is Canvas 2D), master (`mux.sh … 24 0`: grain is painted in the page), readcheck, `poster.jpg` (38.5 s) and `demo/stills/styleframe.jpg` (30 s). `mux.sh` needs ffmpeg 7+.

File map: `timeline.js` (the grid), `film.js` (shots, cameras, whips, cloth wipes, type, events), `engine/gouache.js` (stroke, ribbon, region, clouds, finish, whip blur), `engine/forms.js` (contours, three-value form painter on a scratch surface with `source-atop`), `engine/figure.js` (2.5D rig for the crew, sheaves), `scenes/hero.js` (the two hero drawings: POINT and LIFT, plus their cloth), `scenes/head.js` (the profile), `scenes/land.js` (sky, sun, storm, field, horizon, wheat, chaff, rain, wagon), `test.js` (`?test=1…5`: model sheets and form tests).

Demo pitfalls: the plates are painted wider than the frame because of the whips (whip offsets 560 / 300 px); the storm's base must sit above the horizon or its edge shows during a vertical whip; the raised arm of LIFT is a separate group rotated about the shoulder, painted behind the body.
