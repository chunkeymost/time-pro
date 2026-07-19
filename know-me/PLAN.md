# Time Pro — Implementation Plan

## Overview

Tiga phase implementasi persistence pada aplikasi Time Pro.

```
Phase 1: JSON File Storage  [COMPLETED]
Phase 2: MySQL Storage      [COMPLETED]
Phase 3: Sync (JSON ↔ MySQL) [COMPLETED]
```

---

## Phase 1: JSON File Storage ✅ COMPLETED

### Goal

Mengganti penyimpanan data in-memory dengan persistent JSON file storage melalui Node.js backend.

### Files Created

| File | Purpose |
|------|---------|
| `backend/package.json` | Dependencies: express, cors, mysql2 |
| `backend/server.js` | Express server + semua REST API routes |
| `backend/src/config.js` | Configuration (port, data path, MySQL credentials) |
| `backend/src/storage/JsonStorage.js` | JSON file read/write dengan CRUD methods |
| `backend/data/tasks.json` | Auto-created dengan seed data (7 tasks) |

### API Endpoints (Phase 1)

```
GET    /api/tasks              → Get all data
POST   /api/tasks              → Create task
PUT    /api/tasks/:id          → Update task
DELETE /api/tasks/:id          → Delete task + todos
POST   /api/tasks/:id/todos    → Add todo
PUT    /api/tasks/:id/todos/:todoId → Update todo
DELETE /api/tasks/:id/todos/:todoId → Delete todo
POST   /api/tasks/:id/evidences    → Add evidence
PUT    /api/tasks/:id/evidences/:evId → Update evidence
DELETE /api/tasks/:id/evidences/:evId → Delete evidence
POST   /api/backup            → Backup tasks.json ke file timestamp
GET    /api/backups           → List semua file backup
POST   /api/restore           → Restore data dari backup
GET    /api/restore-log       → History log restore
POST   /api/sync/commit        → (stub, Phase 3)
```

---

## Phase 2: MySQL Storage ✅ COMPLETED

### Goal

Menambahkan MySQL sebagai storage engine alternatif (dapat dipilih via environment variable).

### Files Created

| File | Purpose |
|------|---------|
| `backend/src/schema/migrations/V1__initial_schema.sql` | DDL 5 tabel: categories, tasks, todos, app_metadata, schema_migrations |
| `backend/src/schema/migrations/V2__seed_categories.sql` | Seed 6 kategori default |
| `backend/src/schema/migrate.js` | Migration runner — versioning & execute DDL |
| `backend/src/storage/MysqlStorage.js` | Database-based storage dengan interface sama seperti JsonStorage |
| `backend/src/seed-from-json.js` | Import data dari `backend/data/tasks.json` ke MySQL |

### Files Modified

| File | Changes |
|------|---------|
| `backend/server.js` | Storage switching via `STORAGE=mysql` env; semua route handler jadi `async`; fix path config |
| `backend/package.json` | Tambah script `db:migrate` dan `db:seed` |

### MySQL Schema (5 Tables)

```sql
-- schema_migrations (auto-created by migrate.js)
CREATE TABLE schema_migrations (
  version INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- categories (lookup table)
CREATE TABLE categories (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT NULL,
  sort_order TINYINT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARSET=utf8mb4;

-- tasks (with soft delete)
CREATE TABLE tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  category_id TINYINT UNSIGNED NOT NULL,
  assignee VARCHAR(255) NOT NULL DEFAULT '',
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0 CHECK (progress <= 100),
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_tasks_dates (start_date, end_date),
  INDEX idx_tasks_assignee (assignee),
  INDEX idx_tasks_deleted (deleted_at)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- todos (with soft delete)
CREATE TABLE todos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id INT UNSIGNED NOT NULL,
  text VARCHAR(500) NOT NULL,
  done TINYINT(1) NOT NULL DEFAULT 0,
  due_date DATE DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  INDEX idx_todos_task (task_id),
  INDEX idx_todos_done (done)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- app_metadata (key-value store)
CREATE TABLE app_metadata (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB CHARSET=utf8mb4;
```

### Storage Switching

```js
const storage = process.env.STORAGE === 'mysql'
  ? new MysqlStorage(config.mysql)
  : new JsonStorage(config.dataPath);
```

### Migration Path

```bash
# 1. Setup database & tabel
cd backend && npm run db:migrate

# 2. Import data dari JSON ke MySQL
cd backend && npm run db:seed

# 3. Jalankan dengan MySQL
cd backend && STORAGE=mysql node server.js
```

### Migration Runner (`migrate.js`)

- Auto-create `schema_migrations` table
- Baca file `.sql` dari `backend/src/schema/migrations/` urut versi
- Execute hanya file yang belum tercatat (pending)
- Setiap file dalam **transaction** — rollback jika gagal
- Tambah file `.sql` baru = tambah migrasi, tanpa edit file lama

### Seed from JSON (`seed-from-json.js`)

- Preserve ID asli (task ID & todo ID dari JSON)
- Guard: cek `app_metadata.json_seeded_at` — skip jika sudah di-seed
- Force: `npm run db:seed -- --force` — hapus data lama, re-import
- Mapping: `task.cat` → `categories.slug` → `category_id`

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Soft delete (`deleted_at`) | Data tidak hilang permanen, bisa di-restore |
| Categories lookup table | Tidak perlu ENUM; bisa ditambah/diedit tanpa alter schema |
| Preserve ID pada seed | Task ID di JSON = Task ID di MySQL, kompatibel frontend |
| Migration runner custom | Ringan, tanpa dependency besar, sesuai skala proyek |
| Dual storage (JSON / MySQL) | JSON untuk development ringan, MySQL untuk production |

---

## Phase 3: Sync (JSON ↔ MySQL) ✅ COMPLETED

### Goal

Enable manual sync antara JSON file dan MySQL database — pengguna bisa "commit" data dari JSON ke MySQL.

### Tasks

- [x] Buat `POST /api/sync/commit` — push semua data JSON ke MySQL
  - Baca seluruh data dari `data/tasks.json`
  - Begin transaction
  - Untuk setiap task: `REPLACE INTO tasks (...) VALUES (...)`
  - Hapus todos lama per task, insert ulang dari JSON
  - Update `metadata.lastSynced` di JSON dan `app_metadata` di MySQL
  - Commit transaction
- [x] Buat `POST /api/sync/pull` — tarik data MySQL ke JSON (overwrite)
- [x] Buat `GET /api/sync/status` — dapatkan timestamp sync terakhir
- [x] Tambah tombol "Commit ke Database" di frontend (header-actions)
- [x] Tambah indikator status sync (last synced timestamp)
- [x] Tambah error handling untuk konflik data

### Frontend Addition

```html
<div class="header-actions">
  <!-- existing buttons... -->
  <button id="sync-btn" class="btn btn-ghost">Commit ke Database</button>
</div>
```

### Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sync/commit` | Push JSON data to MySQL |
| `POST` | `/api/sync/pull` | Pull MySQL data to JSON (overwrite) |
| `GET` | `/api/sync/status` | Get last synced timestamp |

### Architecture

```
  JSON File                  MySQL
     |                         |
     |  POST /api/sync/commit  |
     |------------------------>|  (upsert all tasks + todos)
     |                         |
     |  POST /api/sync/pull    |
     |<------------------------|  (overwrite JSON from MySQL)
     |                         |
```

---

## Frontend Enhancement (Completed)

### 🔔 Bell Notification

Fitur notifikasi yang ditambahkan setelah Phase 2:

- Ikon lonceng (`bell-btn`) di `header-actions` dengan SVG inline
- Titik merah berkedip (`bell-dot`) — animasi `bell-blink` 1.2s ease-in-out infinite
- Sidepeek notifikasi (`#notif-overlay`) — overlay + modal reuse dengan lebar 45%
- Tabel menampilkan todo **pending** dari semua task, kolom: No., To Do List, Tanggal, Sisa Hari, Status, **Aksi**
- Perhitungan sisa hari: `dayDiff(T, due)` → `diff < 0` = "Overdue" (merah), `diff === 0` = "Hari ini", `diff > 0` = "N hari"
- Klik teks todo → tutup notifikasi + buka modal tugas utama
- Toggle checkbox → `updateProgressFromTodos()` + `renderAll()` + `updateBellDot()`
- Dot merah otomatis muncul/sembunyi berdasarkan ada/tidaknya todo pending

### 📎 Evidence Panel

Fitur evidence yang ditambahkan untuk melampirkan link bukti/dokumentasi ke tugas:

- Tombol **"+ Add Evidence"** di `modal-actions-right` (sejajar dengan Simpan)
- Sidepeek dari **kiri** layar (`#evidence-overlay`) — terlihat bersamaan dengan modal task
- Form input: `[Link URL] [Keterangan] [Tambah]`
- Tabel evidence: No. | Tanggal | Link Evidence (shortened 45 char + tooltip) | Keterangan | ✕
- Kolom **Tanggal** menampilkan `created_at` evidence format `id-ID`
- Link evidence di-shorten dengan `shortenUrl(url, 45)` — full URL di `title` tooltip
- CRUD via API: `POST/PUT/DELETE /api/tasks/:id/evidences/:evId`
- Data persist di JSON (`task.evidences[]`) dan MySQL (`evidences` table via V3 migration)
- Migration `V3__create_evidences.sql` — tabel `evidences` dengan soft delete
- Seed otomatis: `seed-from-json.js` mengimpor evidence dari JSON ke MySQL (termasuk `created_at`)

### 🍞 Toast Notification

Fitur notifikasi popup kecil (`showToast`) untuk feedback aksi:

- `toast-container` fixed bottom-right dengan `z-index: 999`
- `showToast(msg, type)` — type `success` (hijau) / `error` (merah)
- Animasi `toast-in` — fade-in + translateY, auto-hide 3 detik
- Digunakan oleh: copy teks todo (`showToast('Teks berhasil tercopy')`), backup (`showToast('Backup berhasil: '+file)`)

### 📋 Copy Todo (Aksi)

Fitur copy teks todo dengan Bootstrap Icons:

- Bootstrap Icons CDN: `bootstrap-icons.min.css` dari `cdn.jsdelivr.net`
- Kolom **Aksi** di tabel notifikasi dengan tombol `bi-copy`
- Copy via `navigator.clipboard.writeText()` + Toast Notification
- Hover reveal — tombol muncul saat hover row

### 🏁 Finish Flag

Fitur visual untuk tugas yang sudah selesai (progress 100%):

- Class `done` pada `sidebar-row` — latar hijau `rgba(34,197,94,0.1)`
- Emoji 🏁 (`done-flag`) di samping nama tugas
- Hover & selected state dengan warna hijau lebih kuat

### 📊 Jumlah Hari Pengerjaan

Fitur penghitung hari kerja per tugas:

- Helper `countWeekdays(start, end)` — menghitung Sen–Jum dalam rentang tanggal
- Muncul di sidebar: `... · 60% · 12 Hari Pengerjaan`
- Update otomatis saat drag/resize task

### 🔼 Sorting ASC

Fitur pengurutan daftar tugas:

- `tasks.sort((a, b) => a.start - b.start)` — di `loadTasks()` setelah fetch
- Sorting ulang setelah `POST /api/tasks` (create task baru)
- Urut berdasarkan `start` date ascending

### ↔️ Lebar Sidebar Diperluas

Fitur penyesuaian lebar sidebar:

- Dari fixed `350px` → `calc(350px + 7vw)` (25% lebih lebar)
- Responsive: `250px` → `calc(250px + 7vw)`

### ✏️ Editable Project Title

Fitur edit judul proyek secara inline:

- Klik teks judul (`#project-title`) atau icon pensil → berubah jadi `<input>` dengan font & style yang sama
- `Enter` atau `blur` → simpan via `PUT /api/metadata { title }`
- `Escape` → cancel, kembali ke nilai semula
- Validasi: empty string tidak diizinkan (revert fokus ke input)
- Icon ✏️ (28px) muncul saat hover `.title-row`, opacity 0 → 1
- CSS: `.title-row` flex container, `.title-input` dengan outline gold focus
- Data persist di JSON metadata dan MySQL app_metadata

### 📐 BASE_DESIGN.md

Dokumentasi design system sebagai acuan konsistensi UI:

- Font family: Space Grotesk (heading), Inter (body), IBM Plex Mono (monospace)
- Color palette: 16 CSS custom properties (paper, ink, gold, status, dll)
- Typography scale: 9px–30px
- Spacing system, border radius, shadows, animations
- Responsive breakpoints: 820px (tablet), 480px (mobile)
- Component patterns: buttons, forms, tables, overlay, toast, confirm dialog
- JavaScript conventions: IIFE, API helper, utility functions, keyboard shortcuts
- File structure dan backend stack

### 💾 Backup & Restore

Fitur persistence, backup, dan restore data:

- **Backup** — Tombol "KEPT ON IT" di header → konfirmasi → `POST /api/backup` → simpan salinan `tasks.json` ke file timestamp di `data/`
- **Restore** — Tombol "RESTORE" di header → sidepeek panel → `GET /api/backups` → pilih file backup → konfirmasi → `POST /api/restore { filename }` → overwrite `tasks.json`
- **Restore Log** — History restore disimpan terpisah di `data/restore-log.json` (bukan di `tasks.json`)
- **Endpoint baru:**
  - `GET /api/backups` — List semua file `task-*.json` di `data/`, diurutkan dari terbaru
  - `POST /api/restore` — Baca file backup, overwrite `tasks.json`, catat log (Restored/Failed)
  - `GET /api/restore-log` — Ambil array history restore dari `data/restore-log.json`
- **History Log di UI** — Sidepeek restore panel menampilkan daftar history (status, filename, timestamp) setelah daftar file backup
- **File terpisah** — `data/restore-log.json`: array `[{ status, filename, restoreAt }]` — tidak tercampur dengan data tugas

## How to Run

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# Phase 1: JSON Storage (default)
npm start            # node server.js

# Phase 2: MySQL Storage
npm run db:migrate   # Buat tabel + seed kategori
npm run db:seed      # Import data dari JSON ke MySQL
STORAGE=mysql npm start   # Jalankan dengan MySQL

# Development mode (auto-restart on changes)
npm run dev
```

Buka `http://localhost:3000` di browser.
