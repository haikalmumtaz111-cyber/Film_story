# Warta Kilat Nusantara: Anak Muda dan Buku Kas Negara

Film dokumenter 3:01 bergaya 1920s Newsreel (`styles/newsreel`) tentang lapangan kerja anak muda, PHK, APBN 2026 dan kelas menengah.

Yang ada di repo ini hanya kode dan dokumen. Video, foto, rekaman suara ElevenLabs, font dan hasil render tidak disertakan karena hak ciptanya milik pemiliknya masing-masing (lihat `CREDITS.md`).

| File | Isi |
|---|---|
| `RISET.md` | Data, sumber dan uji asumsi topik |
| `BRIEF.md`, `TREATMENT.md` | Brief film, tiga struktur kandidat, peta cue |
| `SCRIPT.md`, `VO_ELEVENLABS.txt` | Naskah per baris (VO, subtitle, visual, kode sumber) dan teks untuk ElevenLabs |
| `CREDITS.md` | Kredit data, video, foto, musik, font |
| `warta-kilat.srt` | Subtitle bahasa Indonesia |
| `index.html` | Halaman film: semua scene, transisi, tipe, `render(t)` |
| `mix.py` | Skor band orisinal, foley, suara pita optik, mixing |
| `tools/timeline.py` | Jam film: potong VO per baris, waktu scene, hit, cue subtitle |
| `tools/prep.py` | Grading foto/video, peta Jawa (Natural Earth) |
| `tools/final_asr.py`, `tools/subcheck.mjs` | Cek ucapan di film jadi dan lebar subtitle |
| `sb/index.html`, `tools/sbsheet.py` | Storyboard |

## Membangun ulang

Butuh `raw/` (video dan foto), `voice/vo_full.mp3` dan `voice/asr_full.json` (transkrip Whisper), `fonts/` (Limelight, Oswald, Noto Sans) dan Natural Earth `ne_10m_land.geojson`. Dari root library:

```sh
.venv/bin/python films/genz-fiskal/tools/timeline.py
.venv/bin/python films/genz-fiskal/tools/prep.py ne_10m_land.geojson
node core/render/readcheck.mjs films/genz-fiskal
.venv/bin/python films/genz-fiskal/mix.py
node core/render/video.mjs films/genz-fiskal --fps 24 --workers 5 --out films/genz-fiskal/out/video.mp4
sh core/render/mux.sh films/genz-fiskal/out/video.mp4 films/genz-fiskal/out/mix.wav films/genz-fiskal/warta-kilat-nusantara.mp4 24 7
```
