# Time Pro — Lini Waktu Proyek

Project management timeline / Gantt chart interaktif dengan backend Node.js + dual storage (JSON default, MySQL opsional).

## Cara Menjalankan

```bash
# Install dependencies (dari root)
npm install

# Setup environment variables
cd backend && cp .env.example .env   # Edit .env sesuai kebutuhan

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
- **Garis "Hari Ini"** — Penanda tanggal sekarang secara otomatis
- **Dual Storage** — JSON file (default) atau MySQL (opsional via `STORAGE=mysql`)
- **Migration System** — Perubahan schema database terversioning dan repeatable
- **Soft Delete** — Task/todo tidak hilang permanen, bisa di-restore (MySQL mode)
- **Seed Data** — Import data dari JSON ke MySQL dengan guard double-import
- **Backup & Restore** — Backup data ke file timestamp, restore dari backup, history log backup & restore terpisah
- **Editable Project Title** — Judul proyek bisa diubah langsung via klik (inline edit) — tersimpan di metadata server
- **📊 Reporting** — Ringkasan laporan tugas berdasarkan periode tanggal (client-side), dengan export PDF dan breakdown per kategori

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
| `POST` | `/api/backup` | Backup tasks.json ke file timestamp |
| `GET` | `/api/backups` | List semua file backup di data/ |
| `POST` | `/api/restore` | Restore data dari file backup |
| `GET` | `/api/restore-log` | Ambil history log restore & backup |
| `GET` | `/api/metadata` | Ambil metadata (title, versi, lastSynced) |
| `PUT` | `/api/metadata` | Update metadata (title) |
| `POST` | `/api/sync/commit` | Sync JSON ke MySQL (stub) |

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
- Lihat `know-me/PLAN.md` untuk migration path lengkap
- Lihat `know-me/BASE_DESIGN.md` untuk panduan design system dan konsistensi UI
- Judul proyek bisa diedit langsung dengan mengklik teks judul di header — perubahan otomatis tersimpan ke server
