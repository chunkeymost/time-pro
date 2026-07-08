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
- **Kategori & Warna** — 6 kategori tugas (Desain, Pengembangan, Pengujian, Peluncuran, Research, Lainnya) dengan kode warna berbeda
- **Progress Bar** — Visualisasi persentase progres per tugas
- **To Do List** — Subtask checklist dengan due date; progress otomatis terhitung dari todo yang selesai
- **🔔 Notifikasi Tugas** — Ikon lonceng dengan indikator merah berkedip jika ada todo pending; sidepeek menampilkan semua todo belum selesai dengan info sisa hari (Overdue jika lewat)
- **Garis "Hari Ini"** — Penanda tanggal sekarang secara otomatis
- **Dual Storage** — JSON file (default) atau MySQL (opsional via `STORAGE=mysql`)
- **Migration System** — Perubahan schema database terversioning dan repeatable
- **Soft Delete** — Task/todo tidak hilang permanen, bisa di-restore (MySQL mode)
- **Seed Data** — Import data dari JSON ke MySQL dengan guard double-import

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

## Rencana Pengembangan

| Phase | Status | Deskripsi |
|-------|--------|-----------|
| **Phase 1** | ✅ Selesai | JSON file storage via Node.js backend |
| **Phase 2** | ✅ Selesai | MySQL storage engine + migration runner + seed |
| **Phase 3** | 📋 Rencana | Sync mechanism (JSON ↔ MySQL) |

Lihat `know-me/PLAN.md` untuk detail rencana implementasi.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+) — single file
- **Backend:** Node.js 20+, Express 4
- **Database:** MySQL 8+ via `mysql2` (opsional)
- **Migration:** Custom runner (file-based SQL versioning)

## Catatan

- Data tersimpan secara persistent di `backend/data/tasks.json` — tidak hilang saat browser di-refresh
- File `frontend/index.html` tetap single-file; backend terpisah di `backend/server.js` + `backend/src/`
- MySQL membutuhkan: `cd backend && npm run db:migrate` (buat tabel) lalu `cd backend && npm run db:seed` (import data) sebelum `STORAGE=mysql npm start`
- Lihat `know-me/PLAN.md` untuk migration path lengkap
