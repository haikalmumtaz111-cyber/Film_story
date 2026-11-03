#!/bin/sh
# Rebuild "The Last Field" (terpning-poster) from scratch. Run from anywhere. Needs ffmpeg 7+ for the master.
set -e
D="$(cd "$(dirname "$0")" && pwd)"; LIB=${LIB:-$(cd "$D/../../.." && pwd)}; cd "$LIB"
sh "$D/tools/fetch_fonts.sh" >/dev/null                      # Cinzel, Oswald, Noto Serif SC subset (OFL)
node core/render/events.mjs "$D"                              # DUR + sound events -> demo/events.json
.venv/bin/python "$D/music/score.py"                           # score (sampler, VSCO 2 CE)
.venv/bin/python "$D/mix.py"                                   # foley, beds, mix -> demo/out/mix.wav
node core/render/video.mjs "$D" --fps 24 --workers 4 --out "$D/out/video24.mp4"
sh core/render/mux.sh "$D/out/video24.mp4" "$D/out/mix.wav" "$D/../terpning-poster.mp4" 24 0   # board grain is painted in the page
node core/render/readcheck.mjs "$D"
node core/render/still.mjs "$D" 38.5 --prefix poster_ --out "$D/out"
cp "$D/out/poster_38.5.jpg" "$D/../poster.jpg"
node core/render/still.mjs "$D" 30 --prefix sf_ --out "$D/out"
cp "$D/out/sf_30.jpg" "$D/stills/styleframe.jpg"
