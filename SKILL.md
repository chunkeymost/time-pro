---
name: project-timeline-html
description: Membuat template project management timeline / Gantt chart interaktif dalam satu file HTML+CSS+JS (tanpa framework, tanpa build step). Gunakan skill ini setiap kali pengguna meminta "timeline proyek", "gantt chart", "project timeline", "jadwal proyek", "roadmap proyek", atau template manajemen proyek berbasis HTML/JS murni — termasuk saat mereka hanya menyebut ingin melihat/melacak tugas dan tanggal berjalan (start-end date) secara visual. Pastikan skill ini dipakai walau permintaan tidak eksplisit menyebut "gantt", selama konteksnya adalah visualisasi jadwal/tugas proyek dengan output HTML mandiri (bukan file .pptx/.xlsx/.docx — untuk itu gunakan skill dokumen yang sesuai).
---

# Project Timeline HTML

Skill ini membuat template **lini waktu proyek interaktif** (gaya Gantt chart) sebagai satu file HTML mandiri — HTML + CSS + JavaScript saja, tanpa dependency build, tanpa React, tanpa backend. Cocok untuk dibuka langsung di browser atau dibagikan sebagai artifact `.html`.

## Kapan menggunakan skill ini

Trigger untuk skill ini termasuk permintaan seperti:
- "buatkan timeline project management"
- "gantt chart untuk proyek X"
- "template jadwal proyek dalam HTML"
- "saya mau lihat tugas dan progres proyek secara visual"
- "bikin roadmap proyek yang bisa diedit"

Jangan gunakan skill ini jika pengguna secara eksplisit meminta file `.xlsx` (pakai skill `xlsx`), `.pptx` (pakai skill `pptx`), atau `.docx` (pakai skill `docx`) — skill ini khusus untuk output web (HTML/CSS/JS).

## Cara memakai skill ini

1. **Mulai dari template**, jangan menulis ulang dari nol. Salin `assets/template.html` ke `/home/claude/`, lalu sesuaikan sesuai kebutuhan pengguna sebelum menyalin hasil akhirnya ke `/mnt/user-data/outputs/`.
2. **Kumpulkan konteks minimum** sebelum menyesuaikan (boleh berasumsi wajar dan sebutkan asumsinya, jangan berhenti hanya untuk bertanya):
   - Nama proyek dan rentang waktu kasar (kalau tidak disebutkan, pakai tanggal hari ini sebagai acuan seperti pada template).
   - Daftar tugas nyata jika pengguna sudah menyebutkannya (nama tugas, tanggal mulai/selesai, penanggung jawab, kategori). Jika belum ada, isi dengan data contoh yang masuk akal seperti pada template, lalu jelaskan bahwa itu bisa diubah lewat tombol "+ Tugas Baru".
   - Kategori/tim yang relevan (default: Desain, Pengembangan, Pengujian, Peluncuran, Lainnya) — ganti label & warna kelas `cat-*` di CSS bila pengguna menyebut tim/kategori berbeda (misalnya Marketing, Riset, Produksi).
3. **Edit seperlunya di `<script>`**, bagian `let tasks = [...]` — ini satu-satunya tempat yang biasanya perlu diubah untuk mengganti data proyek. Setiap task punya bentuk:
   ```js
   { id:1, name:"Nama Tugas", start:addDays(T,-4), end:addDays(T,4), cat:"desain", assignee:"Nama", progress:60 }
   ```
   `T` adalah variabel hari ini (`today()`), gunakan `addDays(T, n)` untuk tanggal relatif, atau `new Date(2026,6,15)` (bulan berbasis 0) untuk tanggal absolut.
4. **Judul proyek**: ubah `value` pada `<input id="project-title">` di HTML sesuai nama proyek pengguna.
5. **Jangan tambahkan localStorage/sessionStorage** — file ini dirender sebagai artifact HTML di Claude.ai, dan browser storage API tidak didukung di sana. Semua data tetap di variabel JS in-memory (`tasks` array), sesuai desain template.
6. Simpan hasil akhir ke `/mnt/user-data/outputs/<nama-proyek>-timeline.html`, lalu presentasikan dengan `present_files`.

## Fitur bawaan template (jangan dihapus tanpa alasan kuat)

- Ruler tanggal dengan mode tampilan **Minggu** (40px/hari) dan **Bulan** (14px/hari).
- Garis merah **"HARI INI"** otomatis mengikuti tanggal sistem (`new Date()`).
- **Drag** batang tugas untuk memindahkan jadwal, **tarik ujung kiri/kanan** untuk mengubah durasi — logika ada di fungsi `attachBarDrag`.
- Modal tambah/ubah/hapus tugas (nama, tanggal, kategori, penanggung jawab, progres %).
- Sidebar daftar tugas yang selalu sinkron dengan lini waktu.
- Palet warna gaya "blueprint drafting" (kertas gambar teknis, tinta navy, aksen emas, garis potong merah) — token warna ada di `:root` CSS. Jika pengguna minta gaya visual berbeda, ubah token warna & font di `:root`, jangan tulis ulang struktur HTML/JS.

## Poin kustomisasi umum

| Permintaan pengguna | Yang diubah |
|---|---|
| Ganti nama/tanggal tugas | Array `tasks` di `<script>` |
| Ganti kategori/tim | Objek `CATS` + kelas `.cat-*` di CSS |
| Ganti skema warna | Variabel CSS di `:root` (`--paper`, `--ink`, `--gold`, dst.) |
| Ganti bahasa ke Inggris | Semua teks berbahasa Indonesia (label, placeholder, `MONTHS_ID`, `DOW_ID`, teks tombol) |
| Tambah kolom baru (mis. anggaran) | Tambah field di modal (`<div class="field">`) + properti baru di object task + tampilkan di `renderSidebar`/bar label sesuai kebutuhan |
| Export/import data (persist) | Tambahkan tombol export JSON (unduh file) / import (upload file) — **hindari** localStorage karena tidak didukung di artifact Claude.ai |

## Catatan teknis

- Font dimuat dari Google Fonts CDN (`fonts.googleapis.com`) — ini dimuat oleh browser pengguna saat file dibuka, bukan oleh sandbox Claude, jadi tidak terpengaruh pembatasan jaringan di sisi Claude.
- Semua tanggal dibandingkan sebagai objek `Date` dengan `setHours(0,0,0,0)` agar perbandingan hari akurat tanpa masalah zona waktu jam.
- File ini harus tetap **satu file tunggal** (CSS & JS inline) kecuali pengguna eksplisit minta dipecah menjadi beberapa file.
