# Terpning Epic Poster Gouache — Style Prompt

> A 1960s hand-painted epic film poster that moves: gouache with oil highlights, forms drawn solidly and then painted in three values, a low sun against a cobalt sky, one hero in the centre with cloth streaming. The poster grammar (hero, crowd, landscape, title band) is the film's grammar.
> References (grammar only): Howard Terpning's paintings and his roadshow-era film posters (solid figures, warm–cool light, cloth and dust in the wind); the hand-painted one-sheets and billboards of 1960s widescreen epics (one hero centred and largest, smaller figures receding, the title lettered into the ground); David Lean-era staging (low horizon, huge sky). Never copy their images, compositions, lettering, characters or music, and never name them in the film.

## 1. Essence, and what it is not

One glance reads it by: **a hero centred and largest, on a diagonal gesture**, cloth streaming; **warm–cool contrast** (a cobalt sky warming to cream at a low sun, an ochre ground); **forms modelled in three values** with soft-blended terminators and **sharp warm-cream highlights on lit edges**; **directional strokes** that follow each form; light board grain, warm vignette, haze.

Not impasto (the paint is gouache, opaque and matte, with no ridges and no knife planes). Not watercolour (no washes, no paper showing). Not a flat vector poster with a brush texture laid over it. Not a photo filter. Not Van Gogh (strokes never swirl in patterns of their own; they describe forms).

## 2. Materials & rendering

- **Draw first, then paint.** Every form is a closed contour (`smooth`, `limb`, `ellipse`); a figure is a stack of them. The silhouette must read at thumbnail size before any stroke goes on.
- **Three values from the light, per solid.** A point is lit when a short step toward the light leaves the solid, half-lit when a longer step does, in shadow otherwise (`d1`, `d2`). The test runs against the whole solid the form belongs to (`solid: [...]`), so a skirt under a bodice is not lit at its waist. Dithering the test point gives the soft-blended edge between values.
- **Opaque mid-tone base**, then strokes. The base is the form filled in its three values; strokes cover it at about 90 %, so the base shows only as gouache does, between strokes.
- **Directional strokes.** Length 1.5–2.5 × size, width 0.5–0.7 × size, blunt start, ragged lifting end, two bristle streaks. Size on large areas **1/80–1/50 of frame width**; smaller on faces and hands (0.3–0.45 × size). Direction follows the form: down a skirt, along a limb, around a skull, nearly horizontal in a sky.
- **Dry-brush only** on dust, chaff, rain, the frayed end of cloth, a hem, and distant figures (`dry: true`). Never on faces, skin, or the hero's silhouette.
- **Highlights last**: short, sharp warm-cream strokes on edges that face the light (`rim`), never all around a form.
- **Finishing**: board grain ±3 % anchored to the painting (it moves with the world), a warm vignette, a haze band at the horizon. No extra film grain at the mux.
- **Moving paint keeps its strokes**: static paintings are cached; cloth, hair, a gesture, wheat and dust are repainted each frame from fixed seeds in their own (u, v) space, so nothing boils.

## 3. Colour logic

- **Fixed anchors**: cobalt sky `#1F4D97` to pale blue `#A9C3D6`, warming to cream near a low sun; ground `#EEC27A` for any terrain (sand, wheat, snow in late light, a quay); ochre-red `#B56A33` for skin, earth and costume; violet `#6C6394` for distant shadows and haze.
- **Light warms, shadow cools.** Each local colour's three values: the light mixed toward cream, the shadow toward violet. Shadows never go toward black, and the coldest blue lives only in sky and storm.
- **The hero carries the purest chroma** (a red-ochre shawl, a banner); crowd and background sit in duller, hazier versions of the same family.
- **Distance is violet haze**: the further, the paler and more violet, the flatter the value range.
- One accent outside the anchors at most, and only for the story's subject. Never cold-only colour.

## 4. Type & subtitles

- **Poster lettering**: a Roman display capital (e.g. Cinzel, OFL) in warm cream with an ochre-red extrusion, letterspaced; Chinese in a heavy serif (e.g. Noto Serif SC, OFL). Billing in a condensed sans (e.g. Oswald, OFL).
- **Taglines** live in the sky or the ground like a poster's copy line, 44–60 px, never across the hero's head or hands. Titles drop in letter by letter with a bounce on the music grid.
- **Subtitles**, if there is a voice: cream condensed sans with a soft dark shadow, low in the frame, ≤ 2 lines; hold ≥ max(1.8 s, speech + 0.6 s). Everything on screen passes `readcheck`.

## 5. Motion quality

- 24 fps, smooth; no stepping (it is a painting that moves, not a cel).
- **The paintings mostly hold.** What moves is what a poster implies: cloth streaming, hair, wheat and dust in the wind, clouds advancing, light breaking, one gesture per figure.
- **Bounce**: arrivals settle with a spring (a camera nudge on a hit, a sheaf landing, letters dropping in).
- Every gesture has anticipation → action → follow-through (the arm dips before it points, overshoots, settles; the cloth snaps on the hit).
- Gusts are events: one wind envelope drives cloth, wheat and the wind bed.

## 6. Camera grammar

| Move | What it expresses | Can serve |
|---|---|---|
| Slow push to a low close-up | resolve, inner pressure | a decision; a silence before a change; a face against the sky |
| Whip pan out (fast pull-back with directional brush blur) | release, scale, the event becoming an image | revealing the full composition; a jump between places |
| Whip pan across (horizontal or vertical) | energy, a list | work; travel; a montage of hands |
| Low-angle locked frame with a bounce on the hit | heroism, the moment of action | a call; an arrival; a landing |
| Slow truck on a wide with parallax | a world observed, a threat approaching | a landscape; a crowd at work; weather |
| Crane up a little on a full figure | elevation | a triumph; a first sight of something far |

Framing rules: the hero centred and largest in every shot that holds them; horizon low (55–85 % down) so the sky carries the colour; smaller, looser figures recede behind on diagonals. Keep the camera inside the painted plates (plates are painted wider than the frame for whips). Transitions are made of the medium: whip pans with brush blur, cloth crossing the lens, a lightning flash; no dissolves.

## 7. Sound palette

- **Orchestra of the widescreen era**: horns and low brass for the call, timpani rolls and hits, a spiccato or col legno string ostinato for work and travel, snare, trumpet for the theme; one solo string in a silence. Avoid generic piano pads.
- Option: a minor mode resolving to its major at the peak; a horn call of open fifths for the hook.
- **Foley of the open air**: wind over grass or sand as a gusting bed, cloth flaps and snaps, dry straw, metal tools, hooves or boots on dry ground, thunder, rain on dust.
- **Silence** is wind alone at a whisper; the first sound after it is a small physical one (a drop, a breath, a buckle).
- Mix: music ducks under thunder and the key foley; dialogue, if any, 10 dB over the music; −14 LUFS.

## 8. Native moves

- **The frame becomes the poster.** The last shot whips out, the painting settles, the title is lettered into the ground and the board's cream edge appears. *Fits content like:* a launch; a festival's opening; a team's season; a founder's story.
- **Light breaks under the cloud.** A low sun slides under a storm edge; rims flare cream, the cool veil lifts. *Fits content like:* a recovery; a vote won; a rescue; a product shipping after a crisis.
- **Cloth as transition.** The hero's banner, shawl or flag crosses the lens and carries the cut. *Fits content like:* a march; a journey's stages; a relay; a parade.
- **The gesture on the beat.** One arm dips and snaps up on the downbeat; the camera bounces, the cloth cracks taut. *Fits content like:* a call to action; a starting signal; a conductor's downbeat.
- **The receding crowd.** Figures stacked on a diagonal, each smaller, looser, hazier, all acting on the same beat. *Fits content like:* a workforce; volunteers; an expedition; a choir.

## 9. Pitfalls of the medium

- Uniform scratchy hatching (all strokes one size and angle) → vary size by importance, direction by form.
- Flat digital fills with a texture on top → every area gets the three-value base and strokes.
- Each part lit on its own (blotches at every seam) → light the solid, not the part (`solid`).
- Highlights drawn all around a silhouette read as an outline → rim only on edges facing the light.
- Cold-only colour (a blue night without a warm source) → keep a warm light somewhere in frame.
- Tube limbs from a bone rig read as puppets at large sizes → draw contours for anything bigger than a third of the frame; keep rigs for small, loose figures.
- Dry-brush on faces or skin reads as damage → dry-brush only on dust, cloth ends and distant figures.

## 10. Engine

Files: `demo/engine/gouache.js` (stroke, ribbon, region painter, clouds, grain/vignette/haze, whip blur), `demo/engine/forms.js` (contours and the three-value form painter), `demo/engine/figure.js` (2.5D rig for small figures, sheaves), `demo/scenes/*.js` (hero contours, profile head, land, sky, storm, wagon).

Main calls: `form(ctx, {pts, col | tn, light, dir, size, d1, d2, solid, rim, dry, seed})`; `ribbon(ctx, id, spine(u), width(u), {light, tn, size, rim, fold, dryEdge})` for cloth; `region(ctx, box, {test, colorAt, dirAt, sizeAt})` for skies and fields; `clouds(ctx, balls, {tn, light, size, rim})`; `finish(ctx, W, H, {haze, grainM, vig})`.

Minimal example: a lighthouse on a headland at a low sun (not in the demo).
```js
import { form, limb } from './engine/forms.js';
import { finish, P, css } from './engine/gouache.js';
const L = [.9, -.4];                                   // toward the sun, low on the right
ctx.fillStyle = css(P.pale); ctx.fillRect(0, 0, 1920, 1080);
form(ctx, { pts: [[0, 1080], [0, 760], [700, 700], [1100, 820], [1920, 900], [1920, 1080]], col: '#EEC27A', dir: 0, size: 30, d1: 40, d2: 140, light: L, rim: true, seed: 1 });
form(ctx, { pts: limb([[900, 720], [900, 380]], [120, 80]), col: '#E8D9BC', dir: Math.PI / 2, size: 18, d1: 18, d2: 60, light: L, rim: true, seed: 2 });
form(ctx, { pts: [[850, 380], [950, 380], [940, 330], [860, 330]], col: '#B56A33', dir: 0, size: 12, d1: 8, d2: 24, light: L, rim: true, seed: 3 });
finish(ctx, 1920, 1080, { haze: { y: 760, h: 140, c: P.cream, a: .2 } });
```

## 11. Variation space

You decide the story, the hero (a person, an animal, a vehicle, a building), the terrain under `#EEC27A`, the weather, the crowd, the opening, the ending and whether there is a voice. All far from our demo:

- Structures: **an expedition in stages** (one poster plate per stage, joined by whip pans, the hero smaller each time against a bigger land); **a duel of two lights** (dawn and a fire, warm against warm, the cool sky between); **the poster wall** (a street of posters, each a chapter, the camera pushing into one to make it move).
- Openings: **the title first** (lettering bounces in on an empty sky, then the land is painted under it); **a low close-up already in progress** (eyes on the horizon, pull out to the scale); **dust** (a dry-brush cloud clears to reveal the crowd).
- Endings: **freeze into the one-sheet** (a vertical crop, billing block, board edge); **the sun goes down** (the cream drains to violet, one rim light left on the hero); **the crowd passes the camera** (figures walk past the lens, the last one is the hero, wipe to black).

---

How our demo was made (story, shots, score, end card, build): [DEMO.md](DEMO.md). Read it after your treatment exists.
