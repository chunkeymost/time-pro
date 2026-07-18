# Time Pro — Lini Waktu Proyek

Project management timeline / Gantt chart interaktif dengan backend Node.js + dual storage (JSON default, MySQL opsional).

## Cara Menjalankan

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# Mode JSON (default, tanpa MySQL)
npm start

# Mode MySQL
npm run db:migrate              # Buat tabel + seed kategori
npm run db:seed                 # Import data JSON → MySQL
STORAGE=mysql npm start

# Auto-reload (development)
npm run dev
```

Buka `http://localhost:3000` di browser.

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
- **📎 Evidence Panel** — Sidepeek dari kiri untuk lampiran link bukti tugas dengan tanggal dan shorten URL
- **🏁 Finish Flag** — Tugas selesai (100%) ditandai latar hijau + emoji 🏁 di sidebar
- **📊 Jumlah Hari Pengerjaan** — Tampilan jumlah hari kerja pada setiap item daftar tugas
- **Garis "Hari Ini"** — Penanda tanggal sekarang secara otomatis
- **Dual Storage** — JSON file (default) atau MySQL (opsional via `STORAGE=mysql`)
- **Migration System** — Perubahan schema database terversioning dan repeatable
- **Soft Delete** — Task/todo tidak hilang permanen, bisa di-restore (MySQL mode)
- **Seed Data** — Import data dari JSON ke MySQL dengan guard double-import
- **Editable Project Title** — Judul proyek bisa diubah langsung via klik (inline edit) — tersimpan di metadata server

## Arsitektur

```
Browser (frontend/index.html)      ← Frontend
      ↕ REST API (fetch / JSON)
Node.js + Express (backend/server.js) ← Backend
      ↕
backend/data/tasks.json            ← Mode default (JSON)
MySQL Database                     ← Mode STORAGE=mysql
      ↕
cd backend && npm run db:migrate   ← Migration runner
cd backend && npm run db:seed      ← Import JSON → MySQL
```

Lihat `know-me/ARCHITECTURE.md` untuk detail arsitektur.

## API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/tasks` | Ambil semua data |
| `GET` | `/api/tasks/:id` | Ambil detail task |
| `POST` | `/api/tasks` | Buat task baru |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Hapus task + todos |
| `POST` | `/api/tasks/:id/todos` | Tambah todo |
| `PUT` | `/api/tasks/:id/todos/:todoId` | Update todo |
| `DELETE` | `/api/tasks/:id/todos/:todoId` | Hapus todo |
| `POST` | `/api/tasks/:id/evidences` | Tambah evidence |
| `PUT` | `/api/tasks/:id/evidences/:evId` | Update evidence |
| `DELETE` | `/api/tasks/:id/evidences/:evId` | Hapus evidence |
| `POST` | `/api/backup` | Backup tasks.json ke file timestamp |
| `GET` | `/api/metadata` | Ambil metadata (title, versi, lastSynced) |
| `PUT` | `/api/metadata` | Update metadata (title) |

## Rencana Pengembangan

| Phase | Status | Deskripsi |
|-------|--------|-----------|
| **Phase 1** | ✅ Selesai | JSON file storage via Node.js backend |
| **Phase 2** | ✅ Selesai | MySQL storage engine + migration runner + seed |
| **Phase 3** | ✅ Selesai | Sync mechanism (JSON ↔ MySQL) + metadata API |

Lihat `know-me/PLAN.md` untuk detail rencana implementasi.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+) — single file + Bootstrap Icons (CDN)
- **Backend:** Node.js 20+, Express 4
- **Database:** MySQL 8+ via `mysql2` (opsional)
- **Migration:** Custom runner (file-based SQL versioning)
- **Design System:** Dokumentasi di `know-me/BASE_DESIGN.md`

## Catatan

- Data tersimpan secara persistent di `backend/data/tasks.json` — tidak hilang saat browser di-refresh
- File `frontend/index.html` tetap single-file; backend terpisah di `backend/server.js` + `backend/src/`
- Bootstrap Icons dimuat dari CDN untuk ikon copy di notifikasi
- Daftar tugas diurutkan ASC berdasarkan tanggal mulai
- Sidebar diperluas `calc(350px + 7vw)` agar lebih lega
- MySQL membutuhkan: `cd backend && npm run db:migrate` (buat tabel) lalu `cd backend && npm run db:seed` (import data) sebelum `STORAGE=mysql npm start`
- Seed otomatis: jika ada kategori baru di JSON yang belum ada di DB, akan dibuat otomatis
- Lihat `know-me/PLAN.md` untuk migration path lengkap
- Lihat `know-me/BASE_DESIGN.md` untuk panduan design system dan konsistensi UI
- Judul proyek bisa diedit langsung dengan mengklik teks judul di header — perubahan otomatis tersimpan ke server
