# Time Pro — Lini Waktu Proyek

Project management timeline / Gantt chart interaktif dengan backend Node.js + JSON storage.

## Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan server
npm start

# Atau dengan auto-reload (development)
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
- **Kategori & Warna** — 5 kategori tugas (Desain, Pengembangan, Pengujian, Peluncuran, Lainnya) dengan kode warna berbeda
- **Progress Bar** — Visualisasi persentase progres per tugas
- **To Do List** — Subtask checklist dengan due date; progress otomatis terhitung dari todo yang selesai
- **Garis "Hari Ini"** — Penanda tanggal sekarang secara otomatis
- **Persistent Storage** — Data tersimpan di `data/tasks.json` (tidak hilang saat refresh)

## Arsitektur

```
Browser (index.html)
      ↕ REST API (fetch / JSON)
Node.js + Express (server.js)
      ↕
data/tasks.json        ← Phase 1 (JSON Storage)
MySQL Database         ← Phase 2 (coming soon)
      ↕ Sync
POST /api/sync/commit  ← Phase 3 (coming soon)
```

Lihat `ARCHITECTURE.md` untuk detail arsitektur.

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
| `POST` | `/api/sync/commit` | (Phase 3) Sync JSON → MySQL |

## Rencana Pengembangan

| Phase | Status | Deskripsi |
|-------|--------|-----------|
| **Phase 1** | ✅ Selesai | JSON file storage via Node.js backend |
| **Phase 2** | 📋 Rencana | MySQL storage engine |
| **Phase 3** | 📋 Rencana | Sync mechanism (JSON ↔ MySQL) |

Lihat `PLAN.md` untuk detail rencana implementasi.

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+) — single file
- **Backend:** Node.js 20+, Express 4
- **Dependencies:** express, cors, mysql2

## Catatan

- Data tersimpan secara persistent di `data/tasks.json` — tidak hilang saat browser di-refresh
- Seed data (7 contoh task) dibuat otomatis saat pertama kali server dijalankan
- File `index.html` tetap single-file; backend terpisah di `server.js` + `src/`
