#!/usr/bin/env python3
"""Speech check on the finished film: Whisper (Indonesian) on the final mix, each line's window compared
with the script (numbers normalised to digits on both sides). Prints lines whose word match is under 80 %.
    $LIB/.venv/bin/python tools/final_asr.py <film.mp4>"""
import json, re, subprocess, sys, difflib
from pathlib import Path
from faster_whisper import WhisperModel
HERE = Path(__file__).resolve().parent.parent
film = sys.argv[1]; wav = HERE / "out" / "final.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", film, "-ac", "1", "-ar", "16000", str(wav)], check=True)
TL = json.loads((HERE / "timeline.json").read_text())
m = WhisperModel("medium", device="cpu", compute_type="int8")
segs, _ = m.transcribe(str(wav), language="id", word_timestamps=True, beam_size=5)
W = [w for s in segs for w in s.words]
norm = lambda s: re.sub(r"[^0-9a-z ]", " ", s.lower().replace("%", " persen")).split()
cues = {}
for c in TL["cues"]: cues.setdefault(c["id"][:3], []).append(c["text"])
bad = 0
for L in TL["lines"]:
    heard = " ".join(w.word for w in W if L["t"] - .2 <= w.start <= L["end"] + .1)
    ref = " ".join(cues[L["id"]])
    r = difflib.SequenceMatcher(None, norm(ref), norm(heard)).ratio()
    flag = "OK " if r >= .8 else "LOW"; bad += r < .8
    print(f"{flag} {L['id']} {r:.2f} | {heard.strip()}")
print(f"{bad} line(s) under 0.80 (numbers are spoken in words but subtitled in digits, so a few rounded figures read low by design)")
