# Time Pro — Lini Waktu Proyek

Project management timeline / Gantt chart interaktif dengan backend Node.js + dual storage (JSON default, MySQL opsional).

## Cara Menjalankan

```bash
# Install dependencies (dari root)
npm install

# Setup environment variables
cd backend && cp .env.example .env   # Edit .env sesuai kebutuhan

# Buat akun login pertama (wajib sebelum mengakses aplikasi)
cd backend && SUPERADMIN_PASSWORD='password-anda' npm run auth:create -- superadmin --role superadmin

# Mode JSON (default, tanpa MySQL)
cd backend && npm start

# Mode MySQL
# Edit .env: set STORAGE=mysql, isi MYSQL_HOST/PORT/USER/PASSWORD/DATABASE
cd backend && npm run db:migrate    # Buat tabel + seed kategori
cd backend && npm run db:seed       # Import data JSON → MySQL
cd backend && npm start             # Jalankan dengan MySQL

# Auto-reload (development)
cd backend && npm run dev
```

Buka `http://localhost:3000` di browser.

### Environment Variables

Semua konfigurasi diatur via file `.env` (gunakan `.env.example` sebagai template).

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `PORT` | `3000` | Port server |
| `STORAGE` | `json` | Storage mode: `json` atau `mysql` |
| `MYSQL_URL` | — | MySQL connection URL (otomatis diparsing, prioritas tertinggi) |
| `MYSQL_HOST` | `localhost` | MySQL host |
| `MYSQL_PORT` | `3306` | MySQL port |
| `MYSQL_USER` | `root` | MySQL user |
| `MYSQL_PASSWORD` | — | MySQL password |
| `MYSQL_DATABASE` | `db_timepro` | MySQL database name |
| `DATA_PATH` | `backend/data/tasks.json` | Path file JSON storage |
| `AUTH_SECRET` | *auto* | Kunci HMAC untuk tanda tangan security token sesi |
| `AUTH_ENCRYPTION_KEY` | *auto* | Kunci enkripsi AES-256-GCM untuk `data/auth.json` |
| `AUTH_TOKEN_TTL` | `8h` | Umur sesi login (format `30m`, `8h`, `30d`) |
| `AUTH_REMEMBER_TTL` | `30d` | Umur sesi saat memilih "Ingat saya" |
| `AUTH_COOKIE_SECURE` | `false` | Set `true` jika aplikasi diakses via HTTPS |
| `AUTH_LOGIN_MAX_ATTEMPTS` | `5` | Jumlah gagal login sebelum diblokir sementara |
| `AUTH_LOGIN_WINDOW` / `AUTH_LOGIN_BLOCK` | `15m` / `15m` | Jendela hitung & durasi blokir login |
| `ALLOWED_ORIGIN` | — | Origin tambahan yang diizinkan (pisahkan koma) |

> Jika `AUTH_SECRET` / `AUTH_ENCRYPTION_KEY` kosong, server membuat secret otomatis di `backend/data/.auth-secrets.json` (mode 0600). Untuk produksi, isi nilainya di `.env` / secret manager.

## Login & Akun

Aplikasi dilindungi halaman login (`/login.html`).

- **Akun pertama** dibuat via CLI, password dibaca dari env atau prompt (tidak disimpan di source):
  ```bash
  cd backend
  SUPERADMIN_PASSWORD='...' npm run auth:create -- superadmin --role superadmin
  ```
- **Menambah akun lain** (belum ada UI register):
  ```bash
  cd backend && npm run auth:create -- <username> --role admin
  ```
- **Keamanan kredensial**:
  - `backend/data/auth.json` menyimpan akun dalam bentuk **terenkripsi AES-256-GCM per record** — username & password hash tidak terbaca tanpa `AUTH_ENCRYPTION_KEY`.
  - Password di dalam record tetap di-hash **scrypt** (salt acak per akun), tidak pernah disimpan plaintext dan tidak pernah dikembalikan API.
  - File dibuat dengan permission `0600` dan **tidak** ikut backup/restore.
- **Security token**: token sesi ditandatangani HMAC-SHA256, dikirim lewat cookie `HttpOnly` + `SameSite=Strict` (+ `Secure` di produksi). Semua endpoint `/api/*` dan `/uploads/*` menolak request tanpa sesi valid.
- **Rate limit**: 5 percobaan gagal per IP+username → blokir 15 menit (`429` + `Retry-After`).
- Logout tersedia di menu profile (pojok kanan atas) dan langsung mencabut cookie sesi.

## Target Purpose

Aplikasi web ringan untuk memvisualisasikan, melacak, dan mengelola jadwal tugas proyek secara visual dalam bentuk timeline interaktif — cocok untuk individu atau tim kecil yang ingin _planning_ proyek cepat tanpa setup ribet.

## Fitur Utama

- **Gantt Chart Interaktif** — Tampilan timeline tugas dengan drag & drop untuk menggeser jadwal dan resize durasi
- **Dua Mode Tampilan** — Minggu (40px/hari) dan Bulan (14px/hari)
- **Manajemen Tugas CRUD** — Tambah, ubah, dan hapus tugas lewat modal form
- **Sidebar Daftar Tugas** — Selalu sinkron dengan timeline
- **Kategori & Warna** — 7 kategori tugas (Desain, Pengembangan, Pengujian, Peluncuran, Research, Operasional, Lainnya) dengan kode warna berbeda
- **Progress Bar** — Visualisasi persentase progres per tugas
- **To Do List** — Subtask checklist dengan due date; progress otomatis terhitung dari todo yang selesai
- **🔔 Notifikasi Tugas** — Ikon lonceng dengan indikator merah berkedip jika ada todo pending; sidepeek menampilkan semua todo belum selesai dengan info sisa hari (Overdue jika lewat) + tombol copy teks
- **🍞 Toast Notification** — Popup notifikasi sukses/gagal di pojok kanan bawah (copy teks, backup)
- **📎 Evidence Panel** — Sidepeek dari kiri untuk lampiran bukti tugas dengan 3 tipe (Link/Text/Gambar), thumbnail preview, dan shorten URL
- **🏁 Finish Flag** — Tugas selesai (100%) ditandai latar hijau + emoji 🏁 di sidebar
- **📊 Jumlah Hari Pengerjaan** — Tampilan jumlah hari kerja pada setiap item daftar tugas
- **🗓️ Manajemen Hari Libur** — Tombol "Add Holiday" di legend untuk menambah hari libur selain Sabtu/Minggu via popup; bisa edit/hapus, support rentang tanggal (cuti bersama) & keterangan. Tanggal libur diberi warna seperti weekend di gantt chart dan otomatis memotong hitungan "Hari Pengerjaan"
- **📋 Overview Cards** — 3 kartu ringkasan di atas board: Tugas Utama (selesai/total), Sub Task Open, dan Task Overdue
- **👁️ Show/Hide Finished** — Switch untuk menyembunyikan tugas selesai (100%); status tersimpan di localStorage sehingga bertahan setelah refresh
- **Garis "Hari Ini"** — Penanda tanggal sekarang secara otomatis
- **Dual Storage** — JSON file (default) atau MySQL (opsional via `STORAGE=mysql`)
- **Migration System** — Perubahan schema database terversioning dan repeatable
- **Soft Delete** — Task/todo tidak hilang permanen, bisa di-restore (MySQL mode)
- **Seed Data** — Import data dari JSON ke MySQL dengan guard double-import
- **Backup & Restore** — Backup data ke file timestamp, restore dari backup, history log backup & restore terpisah
- **Editable Project Title** — Judul proyek bisa diubah langsung via klik (inline edit) — tersimpan di metadata server
- **📊 Reporting** — Ringkasan laporan tugas berdasarkan periode tanggal (client-side), dengan export PDF dan breakdown per kategori
- **🧾 Minutes of Meeting (MoM)** — Halaman khusus untuk mencatat notulen rapat: info MoM, peserta, agenda, poin pembahasan, keputusan, action item (PIC + due date), what's next, serta pengesahan "Dibuat oleh" & "Disetujui oleh" dengan tanda tangan digital (canvas). Dilengkapi tabel list, filter, preview dokumen, dan export PDF.

## Arsitektur

```
Browser (frontend/index.html)          ← Frontend (single-page)
      ↕ REST API (fetch / JSON)
Node.js + Express (backend/server.js)  ← Backend
      ↕
backend/data/tasks.json                ← Mode default (JSON)
MySQL Database                         ← Mode STORAGE=mysql
      ↕
backend/src/schema/migrate.js          ← Migration runner
backend/src/seed-from-json.js          ← Import JSON → MySQL
```

Lihat `know-me/ARCHITECTURE.md` untuk detail arsitektur.

### Auto-Migration

Jalan otomatis saat `STORAGE=mysql` — `server.js` menjalankan `migrate()` pada startup untuk mengeksekusi migrasi yang pending.

## API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/auth/login` | Login (`username`, `password`, `remember`) → set cookie sesi |
| `POST` | `/api/auth/logout` | Logout & hapus cookie sesi |
| `GET` | `/api/auth/me` | Info user yang sedang login |
| `GET` | `/api/tasks` | Ambil semua data |
| `GET` | `/api/tasks/:id` | Ambil detail task |
| `POST` | `/api/tasks` | Buat task baru |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Hapus task + todos |
| `GET` | `/api/tasks/:id/changelog` | Ambil history perubahan task |
| `POST` | `/api/tasks/:id/todos` | Tambah todo |
| `PUT` | `/api/tasks/:id/todos/:todoId` | Update todo |
| `DELETE` | `/api/tasks/:id/todos/:todoId` | Hapus todo |
| `POST` | `/api/tasks/:id/evidences` | Tambah evidence |
| `POST` | `/api/tasks/:id/evidences/image` | Upload gambar evidence |
| `PUT` | `/api/tasks/:id/evidences/:evId` | Update evidence |
| `DELETE` | `/api/tasks/:id/evidences/:evId` | Hapus evidence |
| `GET` | `/api/tasks/:id/evidence-changelog` | Ambil history perubahan evidence |
| `GET` | `/api/holidays` | Ambil semua hari libur |
| `POST` | `/api/holidays` | Tambah hari libur (`start`, `end`, `keterangan`) |
| `PUT` | `/api/holidays/:id` | Update hari libur |
| `DELETE` | `/api/holidays/:id` | Hapus hari libur |
| `GET` | `/api/mom` | Ambil semua Minutes of Meeting |
| `GET` | `/api/mom/:id` | Ambil detail MoM |
| `POST` | `/api/mom` | Buat MoM baru (nomor otomatis) |
| `PUT` | `/api/mom/:id` | Update MoM |
| `DELETE` | `/api/mom/:id` | Hapus MoM |
| `POST` | `/api/backup` | Backup tasks.json ke file timestamp |
| `GET` | `/api/backups` | List semua file backup di data/ |
| `POST` | `/api/restore` | Restore data dari file backup |
| `GET` | `/api/restore-log` | Ambil history log restore & backup |
| `GET` | `/api/metadata` | Ambil metadata (title, versi, lastSynced) |
| `PUT` | `/api/metadata` | Update metadata (title) |
| `POST` | `/api/sync/commit` | Sync JSON ke MySQL (stub) |

> Catatan: endpoint `/api/mom` saat ini hanya aktif untuk `STORAGE=json`. Jika server dijalankan dengan `STORAGE=mysql`, endpoint MoM akan mengembalikan `501` sampai dukungan MySQL diaktifkan kembali.

## Rencana Pengembangan

| Phase | Status | Deskripsi |
|-------|--------|-----------|
| **Phase 1** | ✅ Selesai | JSON file storage via Node.js backend |
| **Phase 2** | ✅ Selesai | MySQL storage engine + migration runner + seed |
| **Phase 3** | 🔄 Partial Stub | Sync mechanism (JSON ↔ MySQL) — stub endpoint only |

Lihat `know-me/PLAN.md` untuk detail rencana implementasi.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+) — single file + Bootstrap Icons (CDN) + html2pdf.js (CDN)
- **Backend:** Node.js 20+, Express 4
- **Database:** MySQL 8+ via `mysql2` (opsional)
- **Config:** dotenv (environment variables via `.env` file)
- **Migration:** Custom runner (file-based SQL versioning)
- **Design System:** Dokumentasi di `know-me/BASE_DESIGN.md`

## Catatan

- Data tersimpan secara persistent di `backend/data/tasks.json` — tidak hilang saat browser di-refresh
- Hari libur tersimpan di file yang sama (`backend/data/tasks.json`, array `holidays`) bersama data tugas
- Mode MySQL: tabel `holidays` dibuat otomatis oleh auto-migration (`V9__create_holidays.sql`) saat startup
- Minutes of Meeting **saat ini hanya menggunakan penyimpanan JSON**, tersimpan terpisah di `backend/data/mom.json`
- Backup data tugas juga menyertakan data MoM (`mom.json`) dan akan ikut direstore
- Dukungan MySQL untuk MoM ditangguhkan sementara. Migration `V10__create_mom.sql.disabled` tidak dijalankan oleh migration runner dan API MoM menolak storage MySQL hingga fitur diaktifkan kembali.
- History restore & backup disimpan di `backend/data/restore-log.json` (terpisah dari data tugas)
- File `frontend/index.html` tetap single-file; backend terpisah di `backend/server.js` + `backend/src/`
- Bootstrap Icons dimuat dari CDN untuk ikon copy di notifikasi
- html2pdf.js dimuat dari CDN untuk export PDF
- Daftar tugas diurutkan ASC berdasarkan tanggal mulai
- Sidebar diperluas `calc(350px + 7vw)` agar lebih lega
- MySQL membutuhkan: `npm run db:migrate` (buat tabel) lalu `npm run db:seed` (import data) sebelum set `STORAGE=mysql` di `.env`
- `MYSQL_URL` otomatis diparsing oleh `config.js` — tidak perlu set `MYSQL_HOST` dll secara terpisah
- Seed otomatis: jika ada kategori baru di JSON yang belum ada di DB, akan dibuat otomatis
- Semua konfigurasi sensitif (password, credentials) diatur via `.env` — tidak di-commit ke git
- Akun login tersimpan terenkripsi di `backend/data/auth.json` (tidak di-commit) — lihat bagian **Login & Akun**
- Halaman login: `frontend/login.html`; halaman aplikasi & `/api/*` tidak dapat diakses tanpa sesi valid
- Lihat `know-me/PLAN.md` untuk migration path lengkap
- Lihat `know-me/BASE_DESIGN.md` untuk panduan design system dan konsistensi UI
- Judul proyek bisa diedit langsung dengan mengklik teks judul di header — perubahan otomatis tersimpan ke server
