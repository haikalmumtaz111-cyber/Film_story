# Brief: Warta Kilat Nusantara, "Anak Muda dan Buku Kas Negara"

| | |
|---|---|
| Gaya | 1920s Newsreel (`styles/newsreel`), varian "reportase lurus": cepat dan sedikit nyindir, tapi tidak menertawakan korban |
| Topik | Dampak kebijakan fiskal terhadap Gen Z dan milenial: lapangan kerja ketat, PHK, belanja negara vs daya beli kelas menengah |
| Durasi | 3:00, 1920×1080, 24 fps, gate 1,37:1 |
| Bahasa | Indonesia (VO dan subtitle) |
| VO | Dibuat user di ElevenLabs, satu file per baris (L00 sampai L42), lalu diproses jadi suara pita optik 1930 (`period_voice()`) |
| Musik | Band hot dance orisinal 200 BPM, fanfare kuningan buat ident, dua band saling sahut di adegan APBN |
| Nama ident | WARTA KILAT NUSANTARA (rekaan, bukan meniru newsreel asli mana pun) |

## Logline

Statistik bilang pengangguran turun ke level terendah sejak 1994, tapi anak muda, buruh pabrik dan kelas menengah lagi ngitung ulang isi dompetnya, sementara buku kas negara makin tebal di sisi belanja.

## Arc

1. **Setup**: kabar gembira resmi (TPT 4,65 persen).
2. **Belokan**: anak muda justru naik ke 17,37 persen, job fair Cikarang, sektor informal.
3. **Tekanan**: Sritex tutup, PHK 2025 rekor 88.519, 2026 sudah 63.789.
4. **Pertanyaan**: ke mana uangnya? MBG Rp335 T, bunga utang Rp599,44 T, defisit 2,85 persen.
5. **Dampak**: kelas menengah menyusut lebih dari 10 juta.
6. **Respons**: Agustus 2025, 17+8 tuntutan, tunjangan rumah DPR dihentikan.
7. **Tombol**: "Angka nasional bilang membaik. Antrean bursa kerja bilang lain."

## Posisi editorial

Film ini menyandingkan data belanja negara dengan data rumah tangga dan tidak mengklaim sebab akibat langsung, karena riset belum punya bukti itu (lihat "Uji asumsi" di `RISET.md`). Klaim serikat buruh dan DPR selalu disebut sebagai klaim, dengan nama pihaknya.

## Yang perlu dikonfirmasi user (sekali jawab)

1. **Materi visual.** Gaya ini dibangun dari materi asli, bukan gambar buatan. Punya foto/video sendiri (job fair, pabrik, demo) yang boleh dipakai? Kalau tidak ada, rencananya: foto berlisensi jelas dari Wikimedia Commons, peta Indonesia digambar kode, plus "koran" dan "telegram" Warta Kilat yang dirancang sendiri (bukan meniru media asli). Footage krisis 1930 tidak dipakai sebagai pengganti Indonesia, biar penonton tidak tertipu.
2. **Subtitle.** Indonesia saja, atau Indonesia + Inggris (dua baris)?
3. **Storyboard dulu?** Default: tidak.
4. **Nama ident** WARTA KILAT NUSANTARA oke, atau mau nama/channel sendiri?

## Panduan VO ElevenLabs

- Suara: laki-laki, energik, cerah, bahasa Indonesia (gaya penyiar). Pakai model multilingual terbaru.
- Setting awal: Stability sekitar 35–45, Similarity 75, Style 30–50, Speed 1,1. Naikkan Stability kalau intonasi angka mulai ngaco.
- Generate per baris dari `VO_ELEVENLABS.txt`, simpan sebagai `L00.mp3` sampai `L42.mp3` (WAV 44,1 kHz lebih bagus). Jangan tambah musik/efek, biarkan suara bersih: efek radio 1930-an dipasang di mixing.
- Angka sudah dieja. Kalau ada yang salah baca (mis. "PDB", "PHK", "Sritex"), coba tulis "pe-de-be", "pe-ha-ka", atau kabari, nanti barisnya diubah.
- Kirim balik ke folder `films/genz-fiskal/voice/`.
