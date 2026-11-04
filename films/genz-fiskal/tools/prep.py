#!/usr/bin/env python3
"""raw/ -> assets/ : base grade (greyscale, percentile levels, S-curve), video stills, Java map (Natural Earth land, no borders).
Run: $LIB/.venv/bin/python tools/prep.py [ne_10m_land.geojson]"""
import json, subprocess, sys, io
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent.parent
RAW, OUT = HERE / "raw", HERE / "assets"
(OUT / "foto").mkdir(parents=True, exist_ok=True)

def grade(im, lo=0.6, hi=99.6, black=14, white=238):
    a = np.asarray(im.convert("L"), np.float32)
    p0, p1 = np.percentile(a, [lo, hi])
    x = np.clip((a - p0) / max(1, p1 - p0), 0, 1)
    x = x + 0.18 * (x - 0.5) * (1 - np.abs(2 * x - 1))
    return Image.fromarray((black + np.clip(x, 0, 1) * (white - black)).astype(np.uint8), "L")

# photos: graded, 2x lanczos (shown as prints, never full-gate)
for f in sorted((RAW / "foto").glob("*.jpg")):
    g = grade(Image.open(f)); g = g.resize((g.width * 2, g.height * 2), Image.LANCZOS)
    g.save(OUT / "foto" / f.name, quality=90); print(f.name, g.size)

# video stills for the storyboard: crop to the 1.37 gate above the broadcaster's lower third
def vframe(src, t, name, box):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(src), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True).stdout
    im = Image.open(io.BytesIO(raw)).crop(box)
    im = grade(im).resize((1480, 1080), Image.LANCZOS); im.save(OUT / name, quality=90); print(name, box)
vframe(RAW / "video/jobfair_bekasi_ricuh.mov", 34, "jobfair.jpg", (405, 30, 405 + 1110, 30 + 810))

# map: Java and around, equirectangular with cos(lat) scaling, land polygons only (no borders: DIRECTOR.md section 13)
if len(sys.argv) > 1:
    d = json.loads(Path(sys.argv[1]).read_text())
    L0, L1, B0, B1 = 104.6, 115.2, -9.6, -4.6
    k = np.cos(np.radians(7.2)); GW, GH = 1480, 1080
    s = min((GW - 80) / ((L1 - L0) * k), (GH - 80) / (B1 - B0))
    ox = GW / 2 - (L0 + L1) / 2 * k * s; oy = GH / 2 + (B0 + B1) / 2 * s
    P = lambda lon, lat: [round(ox + lon * k * s, 1), round(oy - lat * s, 1)]
    polys = []
    for ft in d["features"]:
        g = ft["geometry"]; rings = g["coordinates"] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
        if g["type"] == "Polygon": rings = [rings[0]]
        for r in rings:
            xs = [p[0] for p in r]; ys = [p[1] for p in r]
            if max(xs) < L0 - 2 or min(xs) > L1 + 2 or max(ys) < B0 - 2 or min(ys) > B1 + 2: continue
            pts = [P(x, y) for x, y in r]
            if len(pts) > 6: polys.append(pts)
    cities = {"jakarta": P(106.85, -6.21), "cikarang": P(107.15, -6.26), "bandung": P(107.61, -6.91), "sukoharjo": P(110.84, -7.68), "surabaya": P(112.75, -7.25)}
    (OUT / "java.json").write_text(json.dumps({"polys": polys, "cities": cities}))
    print("map polys", len(polys))

# footage: 24 fps JPEG sequences, cropped to the gate, one level set per clip (sampled across its frames)
TLP = HERE / "timeline.json"
if TLP.exists():
    import shutil
    for k, c in json.loads(TLP.read_text())["clips"].items():
        d = OUT / k
        if d.exists(): shutil.rmtree(d)
        d.mkdir()
        x0, y0, x1, y1 = c["box"]
        subprocess.run(["ffmpeg", "-v", "error", "-ss", str(c["ss"]), "-t", str(c["dur"]), "-i", str(RAW / "video" / c["src"]),
                        "-vf", f"fps=24,crop={x1-x0}:{y1-y0}:{x0}:{y0},hqdn3d=2:2:4:4,scale=1480:1080:flags=lanczos,unsharp=5:5:0.4",
                        "-q:v", "3", str(d / "%03d.png")], check=True)
        fs = sorted(d.glob("*.png"))
        smp = np.concatenate([np.asarray(Image.open(f).convert("L"), np.float32)[::4, ::4].ravel() for f in fs[::6]])
        p0, p1 = np.percentile(smp, [0.6, 99.6])
        for i, f in enumerate(fs):
            a = np.asarray(Image.open(f).convert("L"), np.float32)
            xx = np.clip((a - p0) / max(1, p1 - p0), 0, 1); xx = xx + 0.18 * (xx - 0.5) * (1 - np.abs(2 * xx - 1))
            Image.fromarray((14 + np.clip(xx, 0, 1) * 224).astype(np.uint8), "L").save(d / f"{i:03d}.jpg", quality=88); f.unlink()
        print("clip", k, len(fs), "frames")
