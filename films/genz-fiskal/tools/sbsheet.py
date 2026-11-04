"""Storyboard sheet with shot number, framing, duration and line under each frame."""
import sys
from PIL import Image, ImageDraw, ImageFont
HERE = sys.argv[1]
CAP = [
 ("1 · IDENT · 0:00–0:05", "Lampu sorot, globe, nama mendarat, iris tutup", "L00"),
 ("2 · KORAN DIBANTING · ±0:05–0:13", "Koran Warta Kilat berputar, banting, pensil di 4,65 %", "L01–L03"),
 ("3 · GRAFIK · ±0:14–0:28", "Band berhenti, kartu BPS, lingkaran pensil di 17,37 %", "L04–L07"),
 ("4 · JOB FAIR · ±0:28–0:38", "Footage Kompas TV dicrop, push pelan, kartu tempat", "L08–L10"),
 ("5 · SRITEX · ±0:46–0:56", "Foto dicetak di meja + telegram dibanting", "L14–L16"),
 ("6 · PETA JAWA · ±1:04–1:10", "Garis pantai tanpa batas wilayah, titik PHK per beat", "L19–L20"),
 ("7 · KARTU JUDUL · ±1:15–1:19", "Bingkai deco, BUKU KAS NEGARA, dorong pelan", "-"),
 ("8 · DUEL BUKU KAS · ±1:19–1:42", "Layar terbelah, dua band saling sahut, stempel defisit", "L22–L29"),
 ("9 · KELAS MENENGAH · ±1:52–2:15", "1 figur = 1 juta orang, 11 figur kosong dilingkari", "L33–L36"),
]
F = lambda s, b=False: ImageFont.truetype(f"{HERE}/fonts/{'Oswald.ttf' if b else 'NotoSans.ttf'}", s)
ORDER = [0, 1, 2, 3, 5, 4, 6, 7, 8]
w, cols = 640, 3; h = w * 1080 // 1920; ch = 92
S = Image.new("RGB", (cols * w + (cols + 1) * 16, 3 * (h + ch) + 4 * 16 + 70), (18, 17, 16)); d = ImageDraw.Draw(S)
d.text((16, 18), "WARTA KILAT NUSANTARA · STORYBOARD · 9 SHOT KUNCI · waktu perkiraan", font=F(34, True), fill=(240, 234, 222))
for k, (a, b, c) in enumerate(CAP):
    x = 16 + (k % cols) * (w + 16); y = 70 + 16 + (k // cols) * (h + ch + 16)
    S.paste(Image.open(f"{HERE}/sb/stills/s{ORDER[k]}.5.jpg").convert("RGB").resize((w, h), Image.LANCZOS), (x, y))
    d.text((x, y + h + 8), a, font=F(24, True), fill=(240, 234, 222))
    d.text((x, y + h + 40), b, font=F(19), fill=(200, 194, 182)); d.text((x, y + h + 64), "VO " + c, font=F(17), fill=(160, 154, 142))
S.save(f"{HERE}/STORYBOARD.jpg", quality=90); print(S.size)
