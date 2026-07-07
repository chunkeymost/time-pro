# Time Pro — Implementation Plan

## Overview

Tiga phase implementasi persistence pada aplikasi Time Pro.

```
Phase 1: JSON File Storage  [COMPLETED]
Phase 2: MySQL Storage      [COMPLETED]
Phase 3: Sync (JSON ↔ MySQL) [FUTURE]
```

---

## Phase 1: JSON File Storage ✅ COMPLETED

### Goal

Mengganti penyimpanan data in-memory dengan persistent JSON file storage melalui Node.js backend.

### Files Created

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: express, cors, mysql2 |
| `server.js` | Express server + semua REST API routes |
| `src/config.js` | Configuration (port, data path, MySQL credentials) |
| `src/storage/JsonStorage.js` | JSON file read/write dengan CRUD methods |
| `data/tasks.json` | Auto-created dengan seed data (7 tasks) |

### API Endpoints (Phase 1)

```
GET    /api/tasks              → Get all data
POST   /api/tasks              → Create task
PUT    /api/tasks/:id          → Update task
DELETE /api/tasks/:id          → Delete task + todos
POST   /api/tasks/:id/todos    → Add todo
PUT    /api/tasks/:id/todos/:todoId → Update todo
DELETE /api/tasks/:id/todos/:todoId → Delete todo
POST   /api/sync/commit        → (stub, Phase 3)
```

---

## Phase 2: MySQL Storage ✅ COMPLETED

### Goal

Menambahkan MySQL sebagai storage engine alternatif (dapat dipilih via environment variable).

### Files Created

| File | Purpose |
|------|---------|
| `src/schema/migrations/V1__initial_schema.sql` | DDL 5 tabel: categories, tasks, todos, app_metadata, schema_migrations |
| `src/schema/migrations/V2__seed_categories.sql` | Seed 6 kategori default |
| `src/schema/migrate.js` | Migration runner — versioning & execute DDL |
| `src/storage/MysqlStorage.js` | Database-based storage dengan interface sama seperti JsonStorage |
| `src/seed-from-json.js` | Import data dari `data/tasks.json` ke MySQL |

### Files Modified

| File | Changes |
|------|---------|
| `server.js` | Storage switching via `STORAGE=mysql` env; semua route handler jadi `async`; fix path config |
| `package.json` | Tambah script `db:migrate` dan `db:seed` |

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
npm run db:migrate

# 2. Import data dari JSON ke MySQL
npm run db:seed

# 3. Jalankan dengan MySQL
STORAGE=mysql node server.js
```

### Migration Runner (`migrate.js`)

- Auto-create `schema_migrations` table
- Baca file `.sql` dari `src/schema/migrations/` urut versi
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

## Phase 3: Sync (JSON ↔ MySQL) 📋 PLANNED

### Goal

Enable manual sync antara JSON file dan MySQL database — pengguna bisa "commit" data dari JSON ke MySQL.

### Tasks

- [ ] Buat `POST /api/sync/commit` — push semua data JSON ke MySQL
  - Baca seluruh data dari `data/tasks.json`
  - Begin transaction
  - Untuk setiap task: `REPLACE INTO tasks (...) VALUES (...)`
  - Hapus todos lama per task, insert ulang dari JSON
  - Update `metadata.lastSynced` di JSON dan `app_metadata` di MySQL
  - Commit transaction
- [ ] Buat `POST /api/sync/pull` — tarik data MySQL ke JSON (overwrite)
- [ ] Buat `GET /api/sync/status` — dapatkan timestamp sync terakhir
- [ ] Tambah tombol "Commit ke Database" di frontend (header-actions)
- [ ] Tambah indikator status sync (last synced timestamp)
- [ ] Tambah error handling untuk konflik data

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

## How to Run

```bash
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
