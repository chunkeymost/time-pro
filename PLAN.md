# Time Pro — Implementation Plan

## Overview

Tiga phase implementasi untuk menambahkan persistence pada aplikasi Time Pro.

```
Phase 1: JSON File Storage  [COMPLETED]
Phase 2: MySQL Storage      [NEXT]
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

### Files Modified

| File | Changes |
|------|---------|
| `index.html` | Removed hardcoded seed data; added `fetch()` API calls; semua CRUD via backend |
| `ARCHITECTURE.md` | Documentation of architecture |
| `PLAN.md` | This file |
| `SKILL.md` | Added section for backend & API |
| `README.md` | Added setup instructions, architecture, API table |

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

### Frontend Data Flow

| Action | Local State | API Call |
|--------|-------------|----------|
| Load | `tasks = data` | `GET /api/tasks` |
| Create task | `tasks.push(response.task)` | `POST /api/tasks` |
| Edit task | `Object.assign(task, data)` | `PUT /api/tasks/:id` |
| Delete task | `tasks.filter(...)` | `DELETE /api/tasks/:id` |
| Drag/resize | update Date langsung | `PUT /api/tasks/:id` (on mouseup) |
| Add todo | `todos.push(response.todo)` | `POST /api/tasks/:id/todos` |
| Edit todo | `todo.text = ...` | `PUT /api/tasks/:id/todos/:todoId` |
| Delete todo | `todos.filter(...)` | `DELETE /api/tasks/:id/todos/:todoId` |

### Bug Fixes Applied

| Issue | Fix |
|-------|-----|
| **Delete task tidak responsif** — confirm dialog muncul tapi klik "Ya, Hapus" tidak bereaksi | Confirm dialog dipindahkan ke dalam modal; ganti `confirmCallback` dengan Promise-based `showConfirm`; tambah guard di `closeModal(force)` |

---

## Phase 2: MySQL Storage 📋 PLANNED

### Goal

Menambahkan MySQL sebagai storage engine (dapat dipilih via konfigurasi).

### Tasks

- [ ] Buat `src/schema/database.sql` dengan DDL untuk tabel `tasks` + `todos`
- [ ] Buat database `time_pro` di MySQL
- [ ] Buat `src/storage/MysqlStorage.js` dengan interface sama seperti `JsonStorage`
- [ ] Update `server.js` untuk mendukung switching storage (env variable)
- [ ] Test semua CRUD operations terhadap MySQL

### MySQL Schema

```sql
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'pengembangan',
  assignee VARCHAR(255) NOT NULL DEFAULT '',
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  text VARCHAR(500) NOT NULL,
  done TINYINT(1) NOT NULL DEFAULT 0,
  due_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Storage Switching

```js
// server.js
const storage = process.env.STORAGE === 'mysql'
  ? new MysqlStorage(config.mysql)
  : new JsonStorage(config.dataPath);
```

### Database Credentials

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `8889` |
| User | `root` |
| Password | `root` |
| Database | `time_pro` |

Stored in `src/config.js`.

### Migration Path

1. Buat database & tables via `src/schema/database.sql`
2. Jalankan server dengan `STORAGE=mysql node server.js`
3. Atau gunakan endpoint sync (Phase 3) untuk migrasi data dari JSON

---

## Phase 3: Sync (JSON ↔ MySQL) 📋 PLANNED

### Goal

Enable manual sync antara JSON file dan MySQL database — pengguna bisa "commit" data dari JSON ke MySQL.

### Tasks

- [ ] Buat `POST /api/sync/commit` — push semua data JSON ke MySQL
  - [ ] Baca seluruh data dari `data/tasks.json`
  - [ ] Begin transaction
  - [ ] Untuk setiap task: `REPLACE INTO tasks (...) VALUES (...)`
  - [ ] Hapus todos lama per task, insert ulang dari JSON
  - [ ] Update `metadata.lastSynced` di JSON
  - [ ] Commit transaction
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
STORAGE=mysql npm start

# Development mode (auto-restart on changes)
npm run dev
```

Buka `http://localhost:3000` di browser.
