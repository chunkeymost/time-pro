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
   - Kategori/tim yang relevan (default: Desain, Pengembangan, Pengujian, Peluncuran, Research, Operasional, Lainnya) — ganti label & warna kelas `cat-*` di CSS bila pengguna menyebut tim/kategori berbeda (misalnya Marketing, Riset, Produksi).
3. **Edit seperlunya di `<script>`**, bagian `let tasks = [...]` — ini satu-satunya tempat yang biasanya perlu diubah untuk mengganti data proyek. Setiap task punya bentuk:
   ```js
   { id:1, name:"Nama Tugas", start:addDays(T,-4), end:addDays(T,4), cat:"desain", assignee:"Nama", progress:60, todos:[], evidences:[] }
   ```
    `T` adalah variabel hari ini (`today()`), gunakan `addDays(T, n)` untuk tanggal relatif, atau `new Date(2026,6,15)` (bulan berbasis 0) untuk tanggal absolut. Field `todos` adalah array `{ id, text, done, due }` — progress otomatis terhitung dari checklist ini jika ada isinya. Field `evidences` adalah array `{ id, link, keterangan, created_at }` untuk lampiran bukti tugas.
4. **Judul proyek**: ubah `value` pada `<input id="project-title">` di HTML sesuai nama proyek pengguna.
5. **Jangan tambahkan localStorage/sessionStorage** — file ini dirender sebagai artifact HTML di Claude.ai, dan browser storage API tidak didukung di sana. Semua data tetap di variabel JS in-memory (`tasks` array), sesuai desain template.
6. Simpan hasil akhir ke `/mnt/user-data/outputs/<nama-proyek>-timeline.html`, lalu presentasikan dengan `present_files`.

## Fitur bawaan template (jangan dihapus tanpa alasan kuat)

- Ruler tanggal dengan mode tampilan **Minggu** (40px/hari) dan **Bulan** (14px/hari).
- Garis merah **"HARI INI"** otomatis mengikuti tanggal sistem (`new Date()`).
- **Drag** batang tugas untuk memindahkan jadwal, **tarik ujung kiri/kanan** untuk mengubah durasi — tanggal otomatis disnap ke hari kerja (Sen-Jum).
- **Weekend skip** — bar timeline otomatis terpotong di Sabtu-Minggu, hanya muncul di hari kerja.
- **Side panel kanan** — modal tambah/ubah/hapus tugas (nama, tanggal, kategori, penanggung jawab, progres %, todo list) tampil sebagai panel slide dari kanan, bukan popup tengah.
- **To Do List** — setiap task bisa memiliki subtask checklist. Tiap todo punya due date (date picker) yang mengacu pada rentang start-end task utama. Progress task otomatis dihitung dari persentase todo yang selesai (slider progres disabled saat ada todos). Klik teks todo untuk mengedit.
- **🔔 Notifikasi Tugas** — Ikon lonceng di header dengan titik merah berkedip jika ada todo yang belum selesai. Klik ikon membuka sidepeek kanan (lebar 45%) yang menampilkan daftar todo **pending** dari semua tugas, dilengkapi kolom **Sisa Hari** (Overdue/Hari ini/N hari), **Aksi** (copy teks via Bootstrap Icons), dan checkbox yang bisa di-toggle langsung. Klik teks todo navigasi ke tugas utama dan menutup panel notifikasi. Copy todo menampilkan **Toast Notification** (sukses/gagal).
- **Toast Notification** — Notifikasi popup kecil di pojok kanan bawah dengan animasi fade-in. Muncul saat backup sukses/gagal dan saat copy teks todo.
- **📎 Evidence Panel** — Sidepeek dari **kiri** layar untuk melampirkan link bukti/dokumentasi ke tugas. Form input Link URL + Keterangan, tabel dengan kolom No., Tanggal, Link Evidence (shortened 45 char + tooltip), Keterangan, dan tombol hapus. CRUD via API. Kolom Tanggal menampilkan `created_at` evidence.
- **🏁 Finish Flag** — Tugas dengan progress 100% mendapat latar hijau (`done` class) dan emoji 🏁 di sidebar.
- **📊 Jumlah Hari Pengerjaan** — Sidebar menampilkan jumlah hari kerja (weekday count) setiap tugas.
- **Tag shapes unik** — tiap kategori punya bentuk berbeda di legend (segitiga, lingkaran, segi lima, kotak, belah ketupat, bintang).
- Sidebar daftar tugas yang selalu sinkron dengan lini waktu — **lebar diperluas 25%** dengan `calc(350px + 7vw)`.
- **Sorting ASC** — Daftar tugas otomatis diurutkan berdasarkan tanggal mulai (ASC).
- Konfirmasi hapus — tombol hapus memunculkan dialog konfirmasi sebelum task dihapus.
- Input tanggal native — field start/end date menggunakan `<input type="date">` (date picker browser).
- Palet warna gaya "blueprint drafting" (kertas gambar teknis, tinta navy, aksen emas, garis potong merah) — token warna ada di `:root` CSS. Jika pengguna minta gaya visual berbeda, ubah token warna & font di `:root`, jangan tulis ulang struktur HTML/JS.

## Poin kustomisasi umum

| Permintaan pengguna | Yang diubah |
|---|---|
| Ganti nama/tanggal tugas | Array `tasks` di `<script>` |
| Ganti kategori/tim | Objek `CATS` + kelas `.cat-*` di CSS |
| Ganti skema warna | Variabel CSS di `:root` (`--paper`, `--ink`, `--gold`, dst.) |
| Ganti bahasa ke Inggris | Semua teks berbahasa Indonesia (label, placeholder, `MONTHS_ID`, `DOW_ID`, teks tombol) |
| Tambah kolom baru (mis. anggaran) | Tambah field di side panel (`<div class="field">`) + properti baru di object task + tampilkan di `renderSidebar`/bar label sesuai kebutuhan |
| Export/import data (persist) | Tambahkan tombol export JSON (unduh file) / import (upload file) — **hindari** localStorage karena tidak didukung di artifact Claude.ai |
| Ubah bentuk tag di legend | Edit `clip-path` di selector `.legend-dot.cat-*` dan `.tag-dot.cat-*` |

## Cara menjalankan (dengan Node.js backend)

1. Pastikan Node.js 20+ terinstall
2. `cd backend && npm install`
3. `node backend/server.js` (atau `cd backend && npm run dev` untuk auto-reload)
4. Buka `http://localhost:3000` di browser

## API Backend (Express + Dual Storage)

Aplikasi memiliki backend Node.js dengan dua mode storage:

- **Default:** JSON file (`data/tasks.json`)
- **Opsional:** MySQL 8+ (set `STORAGE=mysql` environment variable)

### Setup MySQL (jika menggunakan MySQL)

```bash
npm run db:migrate              # Buat tabel + seed kategori
npm run db:seed                 # Import data JSON → MySQL
STORAGE=mysql npm start         # Jalankan dengan MySQL
```

### Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/tasks` | Ambil semua data |
| `POST` | `/api/tasks` | Buat task baru |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Hapus task + todos |
| `POST` | `/api/tasks/:id/todos` | Tambah todo |
| `PUT` | `/api/tasks/:id/todos/:todoId` | Update todo |
| `DELETE` | `/api/tasks/:id/todos/:todoId` | Hapus todo |
| `POST` | `/api/tasks/:id/evidences` | Tambah evidence |
| `PUT` | `/api/tasks/:id/evidences/:evId` | Update evidence |
| `DELETE` | `/api/tasks/:id/evidences/:evId` | Hapus evidence |
| `POST` | `/api/backup` | Backup data ke file (JSON mode) |

### Struktur data

Lihat `ARCHITECTURE.md` untuk detail data model Task, Todo, dan schema MySQL.

### Scripts (jalankan dari dalam `backend/`)

| Command | Fungsi |
|---------|--------|
| `npm start` | Jalankan server (JSON mode) |
| `npm run dev` | Jalankan dengan auto-restart |
| `npm run db:migrate` | Jalankan migration database |
| `npm run db:seed` | Import data JSON ke MySQL |
| `STORAGE=mysql npm start` | Jalankan server dengan MySQL |

## Catatan teknis

- Font dimuat dari Google Fonts CDN (`fonts.googleapis.com`) — ini dimuat oleh browser pengguna saat file dibuka, bukan oleh sandbox Claude, jadi tidak terpengaruh pembatasan jaringan di sisi Claude.
- Semua tanggal dibandingkan sebagai objek `Date` dengan `setHours(0,0,0,0)` agar perbandingan hari akurat tanpa masalah zona waktu jam.
- Progress task otomatis berasal dari todo checklist jika `task.todos.length > 0`; jika kosong, progress manual via slider.
- Setiap todo memiliki field `due: Date` — date picker di sisi kiri input teks, range dibatasi oleh start-end task utama.
- Helpers weekend: `isWeekend(d)`, `nextWeekday(d)`, `countWeekdays(a,b)` untuk menangani hari kerja.
- File `frontend/index.html` harus tetap **satu file tunggal** (CSS & JS inline) — backend terpisah di `backend/server.js` dan `backend/src/`.
- Bootstrap Icons dimuat dari CDN (`bootstrap-icons.min.css`) untuk ikon copy di notifikasi.
- MySQL mode menggunakan **soft delete** — task/todo/evidence tidak dihapus permanen, hanya di-set `deleted_at`.
- Migration runner otomatis mendeteksi file SQL baru — cukup tambah file `V3__*.sql` di `backend/src/schema/migrations/`.
- Lihat `ARCHITECTURE.md` untuk arsitektur dan `PLAN.md` untuk rencana implementasi (keduanya di `know-me/`).
