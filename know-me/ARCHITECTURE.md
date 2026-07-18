# Time Pro — Architecture

## Overview

Time Pro adalah aplikasi project timeline / Gantt chart interaktif dengan arsitektur client-server dan dual storage:

```
Browser (frontend/index.html)          ← Frontend: Vanilla HTML/CSS/JS
      ↕  fetch() / REST JSON
Node.js Server (backend/server.js)      ← Backend API
      ↕
backend/data/tasks.json                 ← JSON File Storage (default)
MySQL Database                          ← MySQL Storage (STORAGE=mysql)
      ↕
backend/src/schema/migrate.js           ← Migration runner (DDL versioning)
backend/src/seed-from-json.js           ← Import data JSON → MySQL (DML)
```

Storage dipilih via environment variable `STORAGE=mysql` — default JSON.

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) — single file + Bootstrap Icons (CDN) |
| Backend | Node.js 20+, Express 4 |
| Storage (default) | JSON file (`data/tasks.json`) |
| Storage (opsional) | MySQL 8+ via `mysql2` |
| Migration | Custom runner (`src/schema/migrate.js`) |
| Dependencies | `express`, `cors`, `mysql2` |

## Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Gantt Chart Interaktif** | Tampilan timeline tugas dengan drag & drop untuk menggeser jadwal dan resize durasi |
| **Dua Mode Tampilan** | Minggu (40px/hari) dan Bulan (14px/hari) |
| **Manajemen Tugas CRUD** | Tambah, ubah, dan hapus tugas lewat modal form |
| **Sidebar Daftar Tugas** | Selalu sinkron dengan timeline |
| **Kategori & Warna** | 7 kategori tugas (Desain, Pengembangan, Pengujian, Peluncuran, Research, Operasional, Lainnya) dengan kode warna berbeda |
| **Progress Bar** | Visualisasi persentase progres per tugas |
| **To Do List** | Subtask checklist dengan due date; progress otomatis terhitung dari todo yang selesai |
| **Notifikasi Tugas** | Ikon lonceng dengan indikator merah berkedip jika ada todo pending |
| **Toast Notification** | Popup notifikasi sukses/gagal di pojok kanan bawah |
| **Evidence Panel** | Sidepeek dari kiri untuk lampiran link bukti tugas dengan tanggal dan shorten URL |
| **Finish Flag** | Tugas selesai (100%) ditandai latar hijau + emoji 🏁 di sidebar |
| **Jumlah Hari Pengerjaan** | Tampilan jumlah hari kerja pada setiap item daftar tugas |
| **Garis Hari Ini** | Penanda tanggal sekarang secara otomatis |
| **Editable Project Title** | Judul proyek bisa diedit inline dengan klik — tersimpan via `PUT /api/metadata` |

## Directory Structure

```
time-pro/
├── frontend/
│   └── index.html                  # Frontend (single-page app)
├── backend/
│   ├── server.js                   # Entry point + Express router + storage switching
│   ├── package.json                # Dependencies + scripts
│   ├── .gitignore                  # Ignore node_modules, data, lockfile
│   ├── src/
│   │   ├── config.js               # Konfigurasi path & database
│   │   ├── schema/
│   │   │   ├── migrate.js          # Migration runner — execute pending SQL
│   │   │   └── migrations/
│   │   │       ├── V1__initial_schema.sql
│   │   │       ├── V2__seed_categories.sql
│   │   │       └── V3__create_evidences.sql
│   │   ├── storage/
│   │   │   ├── JsonStorage.js      # File-based storage (sync, default)
│   │   │   └── MysqlStorage.js     # Database-based storage (async)
│   │   └── seed-from-json.js       # Import data tasks.json → MySQL
│   └── data/
│       └── tasks.json              # Auto-created dengan seed data
├── know-me/
│   ├── ARCHITECTURE.md
│   ├── BASE_DESIGN.md
│   ├── PLAN.md
│   └── SKILL.md
└── README.md
```

## Data Model (MySQL)

### `categories` — Lookup table kategori tugas

| Column | Type | Description |
|--------|------|-------------|
| `id` | `TINYINT UNSIGNED` PK AUTO_INCREMENT | Primary key |
| `slug` | `VARCHAR(50)` UNIQUE | Identifier unik (desain, pengembangan, ...) |
| `name` | `VARCHAR(100)` | Nama display (Desain, Pengembangan, ...) |
| `color` | `VARCHAR(7)` | Hex color code |
| `sort_order` | `TINYINT UNSIGNED` | Urutan tampilan |
| `created_at` | `TIMESTAMP` | Auto-generated |

### `tasks` — Tabel utama tugas

| Field | JSON Type | MySQL Column | Description |
|-------|-----------|-------------|-------------|
| `id` | `number` | `tasks.id` INT UNSIGNED AUTO_INCREMENT | Primary key |
| `name` | `string` | `tasks.name` VARCHAR(255) | Task name |
| `start` | `string` (YYYY-MM-DD) | `tasks.start_date` DATE | Start date |
| `end` | `string` (YYYY-MM-DD) | `tasks.end_date` DATE | End date |
| `cat` | `string` | → `tasks.category_id` TINYINT UNSIGNED FK | Refer to `categories.id` |
| `assignee` | `string` | `tasks.assignee` VARCHAR(255) | Person in charge |
| `progress` | `number` (0-100) | `tasks.progress` TINYINT UNSIGNED | Completion % |
| — | — | `tasks.deleted_at` TIMESTAMP NULL | Soft delete |
| `createdAt` | `string` (ISO 8601) | `tasks.created_at` TIMESTAMP | Created timestamp |
| `updatedAt` | `string` (ISO 8601) | `tasks.updated_at` TIMESTAMP | Updated timestamp (auto-update) |

Foreign Key: `category_id` → `categories(id)`

### `todos` — Task checklist items

| Field | JSON Type | MySQL Column | Description |
|-------|-----------|-------------|-------------|
| `id` | `number` | `todos.id` INT UNSIGNED AUTO_INCREMENT | Primary key |
| `taskId` | — | `todos.task_id` INT UNSIGNED FK | → `tasks.id` ON DELETE CASCADE |
| `text` | `string` | `todos.text` VARCHAR(500) | Todo description |
| `done` | `boolean` | `todos.done` TINYINT(1) | Completion status |
| `due` | `string\|null` (YYYY-MM-DD) | `todos.due_date` DATE\|NULL | Due date |
| — | — | `todos.deleted_at` TIMESTAMP NULL | Soft delete |
| `createdAt` | — | `todos.created_at` TIMESTAMP | Created timestamp |
| `updatedAt` | — | `todos.updated_at` TIMESTAMP | Updated timestamp |

### `evidences` — Link evidence tugas

| Field | JSON Type | MySQL Column | Description |
|-------|-----------|-------------|-------------|
| `id` | `number` | `evidences.id` INT UNSIGNED AUTO_INCREMENT | Primary key |
| `taskId` | — | `evidences.task_id` INT UNSIGNED FK | → `tasks.id` ON DELETE CASCADE |
| `link` | `string` | `evidences.link` VARCHAR(500) | URL evidence |
| `keterangan` | `string` | `evidences.keterangan` TEXT | Deskripsi evidence |
| — | — | `evidences.deleted_at` TIMESTAMP NULL | Soft delete |
| `createdAt` / `created_at` | — | `evidences.created_at` TIMESTAMP | Created timestamp (ditampilkan di kolom Tanggal evidence panel) |
| `updatedAt` | — | `evidences.updated_at` TIMESTAMP | Updated timestamp |

### `app_metadata` — Key-value store untuk metadata aplikasi

| Column | Type | Description |
|--------|------|-------------|
| `key` | `VARCHAR(50)` PK | Identifier (json_seeded_at, lastSynced, ...) |
| `value` | `TEXT` | Nilai |
| `updated_at` | `TIMESTAMP` | Auto-update |

### `schema_migrations` — Tracking migrasi database

| Column | Type | Description |
|--------|------|-------------|
| `version` | `INT` PK | Nomor urut migrasi |
| `name` | `VARCHAR(255)` | Nama file migrasi |
| `applied_at` | `TIMESTAMP` | Waktu eksekusi |

## Storage Layer Abstraction

Kedua storage (`JsonStorage` dan `MysqlStorage`) mengimplementasikan interface yang sama,
dengan perbedaan: `JsonStorage` **sync**, `MysqlStorage` **async**.

```js
getAll()                 → { tasks, nextId, nextTodoId, metadata }
getById(id)              → task | null
create(data)             → task
update(id, data)         → task | null
delete(id)               → boolean           // soft delete (MySQL)
addTodo(taskId, data)    → todo | null
updateTodo(taskId, todoId, data) → todo | null
deleteTodo(taskId, todoId)       → boolean   // soft delete (MySQL)
getCategories()          → [{ id, slug, name, color, sort_order }]  // MySQL only
getMetadata()            → { version, lastSynced, updatedAt, title }
updateMetadata(updates)  → { version, lastSynced, updatedAt, title }
```

## Storage Switching

```js
// backend/server.js
const storage = process.env.STORAGE === 'mysql'
  ? new MysqlStorage(config.mysql)
  : new JsonStorage(config.dataPath);
```

## Migration Runner

File: `src/schema/migrate.js`

Cara kerja:
1. Connect ke MySQL
2. Auto-create tabel `schema_migrations` jika belum ada
3. Baca semua file `.sql` dari `src/schema/migrations/` urut versi
4. Bandingkan dengan yang sudah tercatat di `schema_migrations`
5. Execute file yang pending satu per satu dalam **transaction**
6. Jika sukses → catat di `schema_migrations`; jika gagal → rollback

```
npm run db:migrate
```

## Seed from JSON

File: `src/seed-from-json.js`

Mengimport data dari `data/tasks.json` ke MySQL. Preserve ID asli dari JSON.

Guard: mengecek `app_metadata.json_seeded_at`. Jika sudah pernah di-seed → skip.
Force re-import: `npm run db:seed -- --force`

**New behaviors:**
- **Auto-create kategori** — Jika task memiliki `cat` slug yang belum ada di tabel `categories`, seed otomatis membuat kategori baru.
- **Sync evidence** — Jika data sudah pernah di-seed, seed tetap melakukan sync evidence (INSERT IGNORE) untuk mengakomodasi penambahan tabel `evidences` via migrasi V3.
- **Force hapus evidence** — Force mode sekarang menghapus `evidences`, `todos`, dan `tasks` sebelum re-import.
- **Preserve created_at** — Evidence di-seed dengan `created_at` asli dari JSON.

```
npm run db:seed              # Import (dengan guard) + sync evidence
npm run db:seed -- --force   # Force re-import (hapus data lama)
```

## API Endpoints

| Method | Endpoint | Description | Phase |
|--------|----------|-------------|-------|
| `GET` | `/api/tasks` | Get all tasks + metadata | 1 |
| `GET` | `/api/tasks/:id` | Get single task | 1 |
| `POST` | `/api/tasks` | Create task | 1 |
| `PUT` | `/api/tasks/:id` | Update task | 1 |
| `DELETE` | `/api/tasks/:id` | Delete task + cascading todos (soft delete on MySQL) | 1 |
| `POST` | `/api/tasks/:id/todos` | Add todo to task | 1 |
| `PUT` | `/api/tasks/:id/todos/:todoId` | Update todo | 1 |
| `DELETE` | `/api/tasks/:id/todos/:todoId` | Delete todo (soft delete on MySQL) | 1 |
| `POST` | `/api/tasks/:id/evidences` | Add evidence link to task | 1 |
| `PUT` | `/api/tasks/:id/evidences/:evId` | Update evidence | 1 |
| `DELETE` | `/api/tasks/:id/evidences/:evId` | Delete evidence (soft delete on MySQL) | 1 |
| `POST` | `/api/backup` | Backup tasks.json ke file timestamp | 1 |
| `GET` | `/api/metadata` | Ambil metadata (title, versi, lastSynced) | 1 |
| `PUT` | `/api/metadata` | Update metadata (title) | 1 |
| `POST` | `/api/sync/commit` | Sync JSON → MySQL | 3 |

## JSON File Structure (`data/tasks.json`)

Default kosong saat pertama kali install:

```json
{
  "metadata": {
    "version": 1,
    "lastSynced": null,
    "updatedAt": null,
    "title": "Time Pro"
  },
  "tasks": [],
  "nextId": 1,
  "nextTodoId": 1,
  "nextEvidenceId": 1
}
```

Contoh setelah ada data:

```json
{
  "metadata": {
    "version": 1,
    "lastSynced": null,
    "updatedAt": "2026-07-07T12:00:00.000Z",
    "title": "Timeframe as a System Analyst"
  },
  "tasks": [
    {
      "id": 1,
      "name": "Riset & Perencanaan",
      "start": "2026-06-27",
      "end": "2026-07-04",
      "cat": "lainnya",
      "assignee": "Dewi",
      "progress": 100,
      "todos": [],
      "evidences": [],
      "createdAt": "2026-07-07T12:00:00.000Z",
      "updatedAt": "2026-07-07T12:00:00.000Z"
    }
  ],
  "nextId": 2,
  "nextTodoId": 1,
  "nextEvidenceId": 1
}
```

## Sync Mechanism (Phase 3 — Completed)

Proses commit (JSON → MySQL) menggunakan `seed-from-json.js` sebagai dasar:

1. Baca seluruh data dari `data/tasks.json`
2. Untuk setiap task: `INSERT ... ON DUPLICATE KEY UPDATE`
3. Hapus todos lama, insert ulang dari JSON
4. Update `metadata.lastSynced` di JSON dan `app_metadata` di MySQL

## Frontend Data Flow

1. **Init**: `loadTasks()` → `GET /api/tasks` → parse Date strings → sorting ASC by start date → render
2. **Create**: form submit → `POST /api/tasks` → push response to local array → sorting ASC → closeModal → render
3. **Edit**: form submit → `PUT /api/tasks/:id` → update local task → render
4. **Delete**: click Hapus → confirm dialog → `DELETE /api/tasks/:id` → filter local array → `closeModal(true)` → `closeEvidencePanel()` → render
5. **Drag/Resize**: update local Date object immediately → save via `PUT` on `mouseup`
6. **Todos**: create/update/delete via API → render ulang → `updateBellDot()`
7. **Notification Panel**: klik bell btn → `openNotifPanel()` → collect semua `todos` dari semua `tasks` → filter `!done` → urut by due date → hitung `dayDiff(T, due)` → render tabel (No, To Do List, Tanggal, Sisa Hari, Status, Aksi). Toggle checkbox → `updateProgressFromTodos(task)` + `renderAll()` + `updateBellDot()`. Copy teks todo → `showToast()` navigator.clipboard. Klik teks todo → tutup panel notifikasi + `openModal(task)`.
8. **Evidence Panel**: klik "+ Add Evidence" → `openEvidencePanel(taskId)` → sidepeek dari kiri dengan form Link + Keterangan. Render tabel (No, Tanggal, Link Evidence shortened 45 char, Keterangan, ✕ Hapus). CRUD via API. Kolom Tanggal menampilkan `created_at` dalam format `id-ID`.
9. **Toast Notification**: `showToast(msg, type)` — popup di kanan bawah dengan animasi. Digunakan oleh backup (sukses/gagal), copy teks todo (sukses/gagal).
10. **MysqlStorage cat resolution**: `getAll()` dan `getById()` melakukan query lookup `categories` untuk mengembalikan field `cat: slug` dari `category_id`, sehingga frontend mendapatkan data kompatibel dengan format JSON storage.
11. **Title Edit**: Inline edit — klik teks judul di header → span diganti `<input>` → Enter/blur → `PUT /api/metadata { title }` → simpan ke metadata server. Escape untuk cancel. Icon ✏️ (28px) muncul saat hover.
