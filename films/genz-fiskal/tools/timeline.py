#!/usr/bin/env python3
"""The one clock. Cuts the user's ElevenLabs take (voice/vo_full.mp3) into lines at the quietest point
between Whisper segments, places each line in film time (pauses added at the turns), and writes
voice/out/Lxx.wav, voice/out/dur.json and timeline.json (sections, hits, lines, cues, tags, clips).
    $LIB/.venv/bin/python tools/timeline.py"""
import json, math, subprocess
from pathlib import Path
import numpy as np, soundfile as sf

HERE = Path(__file__).resolve().parent.parent
BPM = 200; BEAT = 60 / BPM; BAR = 4 * BEAT
SR = 48000

# id, start/end in the take (Whisper), subtitle (one or two cues: [text, split time in the take])
LINES = [
 ("L00", 0.00, 3.06, "Warta Kilat Nusantara! Kabar ekonomi pekan ini!"),
 ("L01", 3.48, 5.74, "Kabar gembira dari Badan Pusat Statistik!"),
 ("L02", 5.92, 9.08, "Pengangguran nasional turun ke 4,65%."),
 ("L03", 9.08, 10.86, "Terendah sejak tahun 1994!"),
 ("L04", 12.56, 14.76, "Tapi tunggu dulu, Saudara-saudara."),
 ("L05", 15.20, 18.98, "Usia 15 sampai 24 tahun: angkanya malah naik."),
 ("L06", 19.30, 21.74, "17,37%!"),
 ("L07", 21.74, 26.04, "Lebih dari 1 dari 6 pencari kerja muda masih menganggur."),
 ("L08", 26.24, 28.18, "Cikarang, Mei 2025."),
 ("L09", 28.18, 32.58, "Sekitar 25.000 pelamar menyerbu satu bursa kerja."),
 ("L10", 32.84, 36.00, "Lowongannya cuma ribuan. Ada yang sampai pingsan!"),
 ("L11", 36.20, 37.96, "Yang sudah kerja pun belum tentu aman."),
 ("L12", 38.34, 41.78, "Hampir 60% pekerja kita ada di sektor informal."),
 ("L13", 42.40, 43.70, "Sekarang kita ke pabrik!"),
 ("L14", 43.88, 46.32, "Sukoharjo, 1 Maret 2025."),
 ("L15", 46.90, 49.30, "Raksasa tekstil Sritex berhenti total."),
 ("L16", 49.80, 53.90, "10.665 pekerja pulang tanpa pekerjaan."),
 ("L17", 54.14, 59.08, "Sepanjang 2025, Kemnaker mencatat 88.519 korban PHK."),
 ("L18", 59.28, 61.80, "Naik 13,54% dari tahun sebelumnya!"),
 ("L19", 62.14, 65.88, "Tahun ini, sampai September: 63.789 orang."),
 ("L20", 66.30, 67.54, "Jawa Barat paling banyak!"),
 ("L21", 67.94, 72.60, [["Dan itu baru yang tercatat.", 69.65], ["Kata serikat buruh, angka aslinya lebih besar."]]),
 ("L22", 73.08, 75.34, "Lalu, ke mana uang negara mengalir?"),
 ("L23", 75.80, 80.50, "Tahun ini, belanja negara diproyeksi Rp3.942,4 triliun."),
 ("L24", 80.68, 83.86, "Makan Bergizi Gratis: Rp335 triliun."),
 ("L25", 83.86, 87.18, "Bunga utang saja: Rp599,44 triliun."),
 ("L26", 87.36, 89.92, "Itu hampir seperlima pendapatan negara!"),
 ("L27", 90.88, 93.54, "Belanja lari lebih kencang dari pemasukan."),
 ("L28", 93.80, 97.28, "Defisit diperkirakan 2,85% dari PDB."),
 ("L29", 97.52, 99.66, "Batasnya? 3%!"),
 ("L30", 99.66, 104.36, [["Di Senayan, ada yang mengingatkan:", 101.82], ["target pajak tahun ini terlalu tinggi."]]),
 ("L31", 104.52, 107.38, "Kalau pemasukan meleset, siapa yang menambal?"),
 ("L32", 108.10, 112.40, "Sementara itu, di rumah-rumah, dompet makin tipis."),
 ("L33", 112.40, 117.34, "Tahun 2019, kelas menengah kita 57,33 juta orang."),
 ("L34", 117.80, 123.06, [["Tahun lalu, menurut perkiraan Mandiri Institute,", 120.71], ["tinggal 46,7 juta."]]),
 ("L35", 123.58, 125.58, "Berkurang lebih dari 10 juta orang!"),
 ("L36", 126.10, 130.78, "Calon kelas menengah justru membengkak, jadi 142 juta."),
 ("L37", 131.36, 136.66, [["Agustus 2025.", 132.94], ["Soal tunjangan DPR, mahasiswa dan warga turun ke jalan."]]),
 ("L38", 136.82, 139.54, "Lahir 17+8 Tuntutan Rakyat."),
 ("L39", 139.54, 142.28, "DPR akhirnya menghentikan tunjangan rumah."),
 ("L40", 142.84, 144.84, "Angka nasional bilang membaik."),
 ("L41", 145.18, 147.16, "Antrean bursa kerja bilang lain."),
 ("L42", 147.84, 149.24, "Warta Kilat Nusantara!"),
]
# pause added in front of a line (s): the turns, the title card, the silence before the button
GAP = {"L00": 1.3, "L01": .9, "L04": .7, "L08": .3, "L11": 1.2, "L13": .7, "L15": .3, "L17": 1.2, "L22": 4.6,
       "L24": .3, "L27": .7, "L30": .5, "L32": 1.3, "L35": .4, "L37": 1.0, "L40": 1.7, "L41": .3, "L42": 1.4}

# ---- cut the take at the quietest 10 ms between neighbours
x, sr0 = sf.read(HERE / "voice" / "vo_full.mp3", dtype="float32")
if x.ndim > 1: x = x.mean(1)
fr = int(sr0 * .01); rms = np.sqrt(np.convolve(x ** 2, np.ones(fr) / fr, "same"))
def quiet(a, b):
    i0, i1 = int(a * sr0), int(b * sr0)
    if i1 <= i0: return a
    return (i0 + int(np.argmin(rms[i0:i1]))) / sr0
cuts = [max(0, LINES[0][1] - .15)]
for (_, _, e, _), (_, s, _, _) in zip(LINES, LINES[1:]):
    cuts.append(quiet(e - .25, s + .25) if s - e < .5 else quiet(e, s))
cuts.append(len(x) / sr0)
out = HERE / "voice" / "out"; out.mkdir(parents=True, exist_ok=True)
dur, place = {}, {}
for k, (i, s, e, _) in enumerate(LINES):
    a, b = cuts[k], cuts[k + 1]
    seg = x[int(a * sr0):int(b * sr0)].copy()
    # trim leading/trailing near-silence, keep 40 ms of air
    thr = .012; nz = np.where(np.abs(seg) > thr)[0]
    lo = max(0, nz[0] - int(.04 * sr0)) if len(nz) else 0; hi = min(len(seg), nz[-1] + int(.08 * sr0)) if len(nz) else len(seg)
    seg = seg[lo:hi]; f = int(.012 * sr0); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    sf.write(out / f"{i}.wav", seg, sr0)
    dur[i] = round(len(seg) / sr0, 3); place[i] = a + lo / sr0      # take time of the clip's first sample
(out / "dur.json").write_text(json.dumps(dur, indent=1))

# ---- film time: the take keeps its own rhythm, pauses are added at the turns
shift, T = 0.0, {}
for i, s, e, _ in LINES:
    shift += GAP.get(i, 0); T[i] = round(place[i] + shift, 3)
END = {i: round(T[i] + dur[i], 3) for i, *_ in LINES}
take2film = lambda i, tt: T[i] + (tt - place[i])

# word times (film), for the hits that land on a word
W = [w for sgm in json.loads((HERE / "voice" / "asr_full.json").read_text()) for w in sgm["words"]]
def word(i, token, nth=0):
    s, e = next((s, e) for j, s, e, _ in LINES if j == i)
    hits = [w for w in W if s - .3 <= w["s"] <= e + .3 and token.lower() in w["w"].lower()]
    if len(hits) <= nth: raise SystemExit(f"word {token!r} not found in {i}")
    return round(take2film(i, hits[nth]["s"]), 3)

snap = lambda t: round(math.floor(t / BEAT + 1e-6) * BEAT, 4)     # cut on the beat at or before t
snapup = lambda t: round(math.ceil(t / BEAT - 1e-6) * BEAT, 4)
bar_up = lambda t: round(math.ceil(t / BAR - 1e-6) * BAR, 4)
L = lambda i: T[i]

H = {}
H["beams_on"] = .15
H["paper_fly"] = snap(L("L01") - 1.3); H["paper_slam"] = round(H["paper_fly"] + BAR, 4)
H["ul_465"] = word("L02", "4"); H["stop1"] = snapup(END["L03"] + .1)
H["chart_in"] = snap(L("L05") - .15); H["ring_1737"] = word("L06", "17")
H["six_in"] = snap(L("L07") - .1); H["six_ring"] = word("L07", "enam")
H["wipe_jf"] = snap(L("L08") - .2); H["cut_jfA"] = snap(L("L09") + .2); H["cut_jfB"] = snap(L("L10") - .05)
H["inf_in"] = snap(L("L11") - .2); H["inf_deal"] = snap(L("L12") - .1); H["stamp_inf"] = word("L12", "60")
H["fac_in"] = snap(L("L13") - .15); H["map1_in"] = snap(L("L14") - .1); H["star_sk"] = word("L14", "Sukoharjo")
H["sritex_in"] = snap(L("L15") - .15); H["print2"] = snap(L("L16") - .1); H["tele_slam"] = word("L16", "10")
H["kem_in"] = snap(L("L17") - .15); H["ring_1354"] = word("L18", "13")
H["map2_in"] = snap(L("L19") - .15); H["jabar"] = word("L20", "Jawa")
H["pailit_in"] = snap(word("L21", "Serikat") - .1); H["stop2"] = snapup(END["L21"] + .05)
H["card_in"] = bar_up(H["stop2"] + .5)
H["ledger_in"] = snap(L("L22") - .15); H["ul_total"] = word("L23", "4"); H["row_total"] = round(L("L23") + .2, 3)
H["mbg_in"] = snap(L("L24") - .1); H["ledger2_in"] = snap(L("L25") - .1); H["ul_bunga"] = word("L25", "600"); H["ring_lima"] = word("L26", "seperlima")
H["split_in"] = snap(L("L27") - .2); H["stamp_def"] = word("L28", "Defisit"); H["batas"] = word("L29", "3%"); H["stop3"] = snapup(END["L29"] + .05)
H["dpr_in"] = snap(L("L30") - .2); H["stop4"] = snapup(END["L31"] + .05)
H["krl_in"] = snap(L("L32") - .2); H["class_in"] = snap(L("L33") - .2); H["row2"] = snap(L("L34") + .4); H["ring_gap"] = word("L35", "Berkurang")
H["calon"] = word("L36", "142")
H["poster_in"] = snap(L("L37") - .2); H["poster_slam"] = snap(word("L38", "17") - .05); H["stamp_stop"] = word("L39", "menghentikan")
H["button_in"] = snapup(END["L39"] + .25); H["freeze"] = snap(L("L41") - .05)
H["endlogo_in"] = snap(L("L42") - .5); H["end_hit1"] = snapup(END["L42"] + .15); H["end_hit2"] = round(H["end_hit1"] + 1.5 * BEAT, 4)
H["endcard_in"] = bar_up(H["end_hit2"] + 3.4)
DUR = round(H["endcard_in"] + 8.4, 3)

SECS = [("logo", 0, "paper_fly"), ("paper", "paper_fly", "chart_in"), ("chart", "chart_in", "six_in"), ("six", "six_in", "wipe_jf"),
        ("jfC", "wipe_jf", "cut_jfA"), ("jfA", "cut_jfA", "cut_jfB"), ("jfB", "cut_jfB", "inf_in"), ("informal", "inf_in", "fac_in"),
        ("factory", "fac_in", "map1_in"), ("map1", "map1_in", "sritex_in"), ("sritex", "sritex_in", "kem_in"), ("kemnaker", "kem_in", "map2_in"),
        ("map2", "map2_in", "pailit_in"), ("pailit", "pailit_in", "card_in"), ("card", "card_in", "ledger_in"), ("ledger", "ledger_in", "mbg_in"),
        ("mbg", "mbg_in", "ledger2_in"), ("ledger2", "ledger2_in", "split_in"), ("split", "split_in", "dpr_in"), ("dpr", "dpr_in", "krl_in"),
        ("krl", "krl_in", "class_in"), ("class", "class_in", "poster_in"), ("poster", "poster_in", "button_in"), ("button", "button_in", "endlogo_in"),
        ("endlogo", "endlogo_in", "endcard_in"), ("endcard", "endcard_in", None)]
secs = [{"id": i, "t0": H[a] if isinstance(a, str) else a, "t1": H[b] if b else DUR} for i, a, b in SECS]
for s in secs: assert s["t1"] > s["t0"], s

# subtitle cues: one per line, or split at a word
cues = []
for i, s, e, sub in LINES:
    if isinstance(sub, str): cues.append({"id": i, "t": T[i], "text": sub, "spoken": dur[i]})
    else:
        (a, split), (b,) = sub; ts = round(take2film(i, split), 3)
        cues.append({"id": i + "a", "t": T[i], "text": a, "spoken": round(ts - T[i], 3)})
        cues.append({"id": i + "b", "t": ts, "text": b, "spoken": round(END[i] - ts, 3)})
for k, c in enumerate(cues):
    t1 = c["t"] + max(1.8, c["spoken"] + .6)
    if k + 1 < len(cues): t1 = min(t1, cues[k + 1]["t"] - .05)
    c["t1"] = round(t1, 3)

TAGS = [("jf", H["wipe_jf"] + .3, H["inf_in"] - .1, "CIKARANG · 27 MEI 2025", "Bekasi Pasti Kerja Expo"),
        ("sritex", H["sritex_in"] + .2, H["kem_in"] - .1, "SUKOHARJO · 1 MARET 2025", "PT Sri Rejeki Isman (Sritex)"),
        ("kem", H["kem_in"] + .2, H["map2_in"] - .1, "KEMNAKER · JANUARI 2026", "Data PHK peserta JKP"),
        ("mbg", H["mbg_in"] + .15, H["ledger2_in"] - .05, "JAKARTA · 3 FEBRUARI 2025", "Makan Bergizi Gratis"),
        ("dpr", H["dpr_in"] + .2, H["stop4"] - .05, "SENAYAN · JAKARTA", "Gedung DPR RI"),
        ("krl", H["krl_in"] + .2, H["class_in"] - .1, "STASIUN SUDIRMAN", "KRL jam pulang kerja"),
        ("poster", H["poster_in"] + .2, H["button_in"] - .1, "JAKARTA · AGUSTUS 2025", "Protes tunjangan DPR")]
# footage: source, start in the source (s), crop box (x0, y0, x1, y1) on the 1920x1080 source, above any broadcaster lower third
JF = (700, 0, 1796, 800)
CLIPS = {
 "jfC": {"src": "jobfair_bekasi_ricuh.mov", "ss": 33.0, "box": JF},
 "jfA": {"src": "jobfair_bekasi_ricuh.mov", "ss": 6.2, "box": JF},
 "jfB": {"src": "jobfair_bekasi_ricuh.mov", "ss": 37.4, "box": JF},
 "mbg": {"src": "mbg_prabowo_2025-02-03.mov", "ss": 0.2, "box": (150, 0, 1630, 1080)},
 "dpr": {"src": "dpr_drone_2021.mov", "ss": 2.9, "box": (302, 60, 1617, 1020)},
 "krl": {"src": "krl_sudirman_rush.mov", "ss": 4.0, "box": (220, 0, 1700, 1080)},
}
for k, c in CLIPS.items():
    s = next(s for s in secs if s["id"] == k)
    c["dur"] = round(s["t1"] - s["t0"] + .6, 3)
CLIPS["jfC"]["dur"] = round(max(CLIPS["jfC"]["dur"], H["endlogo_in"] - H["freeze"] + .2, 6.0), 3)   # the button freezes a frame of this clip

tl = {"bpm": BPM, "beat": BEAT, "bar": BAR, "dur": DUR, "secs": secs, "hits": H,
      "lines": [{"id": i, "t": T[i], "end": END[i]} for i, *_ in LINES], "cues": cues,
      "tags": [{"sec": s, "t0": round(a, 3), "t1": round(b, 3), "l1": l1, "l2": l2} for s, a, b, l1, l2 in TAGS], "clips": CLIPS}
(HERE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1))
print("timeline.json", DUR, "s |", len(cues), "cues")
for s in secs: print(f"  {s['id']:9s} {s['t0']:7.2f} {s['t1']:7.2f}")
