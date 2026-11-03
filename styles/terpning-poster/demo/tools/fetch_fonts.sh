#!/bin/sh
# Fonts for "The Last Field" (all SIL OFL 1.1). Run from anywhere; skips what is already there.
set -e
D="$(cd "$(dirname "$0")/.." && pwd)/fonts"; mkdir -p "$D"; cd "$D"
G=https://raw.githubusercontent.com/google/fonts/main/ofl
[ -s Cinzel.ttf ] || curl -fsSL -o Cinzel.ttf "$G/cinzel/Cinzel%5Bwght%5D.ttf"
[ -s Oswald.ttf ] || curl -fsSL -o Oswald.ttf "$G/oswald/Oswald%5Bwght%5D.ttf"
[ -s OFL-Cinzel.txt ] || curl -fsSL -o OFL-Cinzel.txt "$G/cinzel/OFL.txt"
[ -s OFL-Oswald.txt ] || curl -fsSL -o OFL-Oswald.txt "$G/oswald/OFL.txt"
# Chinese: only the glyphs the film uses (Google Fonts CSS API, &text=)
TXT="风暴日落时到只剩最后一块地麦田史诗海报水粉"
if [ ! -s NotoSerifSC.ttf ]; then
  ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$TXT")
  URL=$(curl -fsSL -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@900&text=$ENC" | grep -o 'https://[^)]*' | head -1)
  curl -fsSL -o NotoSerifSC.ttf "$URL"
fi
ls -la "$D"
