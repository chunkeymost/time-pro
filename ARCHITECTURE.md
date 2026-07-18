# Time Pro — Architecture

## Overview

Time Pro adalah aplikasi project timeline / Gantt chart interaktif dengan arsitektur client-server:

```
Browser (index.html)              ← Frontend: Vanilla HTML/CSS/JS
      ↕  fetch() / REST JSON
Node.js Server (Express)           ← Backend API
      ↕
data/tasks.json                    ← Phase 1: JSON File Storage
MySQL Database                     ← Phase 2: MySQL (planned)
      ↕
POST /api/sync/commit              ← Phase 3: Manual Sync
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) — single file |
| Backend | Node.js 20+, Express 4 |
| Storage (Phase 1) | JSON file (`data/tasks.json`) |
| Storage (Phase 2) | MySQL 8+ via `mysql2` |
| Dependencies | `express`, `cors`, `mysql2` |

## Directory Structure

```
time-pro/
├── index.html              # Frontend (single-page app)
├── server.js               # Entry point + Express router
├── package.json            # Dependencies
├── src/
│   ├── config.js           # Konfigurasi path & database
│   ├── schema/
│   │   └── database.sql    # MySQL DDL (Phase 2 - planned)
│   └── storage/
│       ├── JsonStorage.js  # File-based storage (Phase 1)
│       └── MysqlStorage.js # Database-based storage (Phase 2 - planned)
├── data/
│   └── tasks.json          # Auto-created dengan seed data
├── ARCHITECTURE.md
├── PLAN.md
├── README.md
└── SKILL.md
```

## Data Model

### Task

| Field | JSON Type | MySQL Column | Description |
|-------|-----------|-------------|-------------|
| `id` | `number` | `tasks.id` INT AUTO_INCREMENT | Primary key |
| `name` | `string` | `tasks.name` VARCHAR(255) | Task name |
| `start` | `string` (YYYY-MM-DD) | `tasks.start_date` DATE | Start date |
| `end` | `string` (YYYY-MM-DD) | `tasks.end_date` DATE | End date |
| `cat` | `string` | `tasks.category` VARCHAR(50) | Category key |
| `assignee` | `string` | `tasks.assignee` VARCHAR(255) | Person in charge |
| `progress` | `number` (0-100) | `tasks.progress` INT | Completion % |
| `createdAt` | `string` (ISO 8601) | `tasks.created_at` TIMESTAMP | Created timestamp |
| `updatedAt` | `string` (ISO 8601) | `tasks.updated_at` TIMESTAMP | Updated timestamp |

### Todo

| Field | JSON Type | MySQL Column | Description |
|-------|-----------|-------------|-------------|
| `id` | `number` | `todos.id` INT AUTO_INCREMENT | Primary key |
| `taskId` | — | `todos.task_id` INT | FK → tasks.id (CASCADE) |
| `text` | `string` | `todos.text` VARCHAR(500) | Todo description |
| `done` | `boolean` | `todos.done` TINYINT(1) | Completion status |
| `due` | `string\|null` (YYYY-MM-DD) | `todos.due_date` DATE\|NULL | Due date |
| `createdAt` | — | `todos.created_at` TIMESTAMP | Created timestamp |
| `updatedAt` | — | `todos.updated_at` TIMESTAMP | Updated timestamp |

## API Endpoints

| Method | Endpoint | Description | Phase |
|--------|----------|-------------|-------|
| `GET` | `/api/tasks` | Get all tasks + metadata | 1 |
| `GET` | `/api/tasks/:id` | Get single task | 1 |
| `POST` | `/api/tasks` | Create task | 1 |
| `PUT` | `/api/tasks/:id` | Update task | 1 |
| `DELETE` | `/api/tasks/:id` | Delete task + cascading todos | 1 |
| `POST` | `/api/tasks/:id/todos` | Add todo to task | 1 |
| `PUT` | `/api/tasks/:id/todos/:todoId` | Update todo | 1 |
| `DELETE` | `/api/tasks/:id/todos/:todoId` | Delete todo | 1 |
| `POST` | `/api/backup` | Backup JSON to timestamped file | 1 |
| `POST` | `/api/sync/commit` | Sync JSON → MySQL (stub) | 3 |
| `POST` | `/api/sync/pull` | Pull MySQL → JSON (planned) | 3 |

## Storage Layer Abstraction

Kedua storage (`JsonStorage` dan `MysqlStorage`) mengimplementasikan interface yang sama:

```js
getAll()                 → { tasks, nextId, nextTodoId, metadata }
getById(id)              → task | null
create(data)             → task
update(id, data)         → task | null
delete(id)               → boolean
addTodo(taskId, data)    → todo | null
updateTodo(taskId, todoId, data) → todo | null
deleteTodo(taskId, todoId)       → boolean
```

## JSON File Structure (`data/tasks.json`)

```json
{
  "metadata": {
    "version": 1,
    "lastSynced": null,
    "updatedAt": "2026-07-07T12:00:00.000Z"
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
      "createdAt": "2026-07-07T12:00:00.000Z",
      "updatedAt": "2026-07-07T12:00:00.000Z"
    }
  ],
  "nextId": 8,
  "nextTodoId": 4
}
```

## Sync Mechanism (Phase 3 — not yet implemented)

Proses commit (JSON → MySQL):

1. Baca seluruh data dari `data/tasks.json`
2. Untuk setiap task: `INSERT ... ON DUPLICATE KEY UPDATE`
3. Hapus todos lama, insert ulang dari JSON
4. Update `metadata.lastSynced` di JSON

## Frontend Data Flow

1. **Init**: `loadTasks()` → `GET /api/tasks` → parse Date strings → render
2. **Create**: form submit → `POST /api/tasks` → push response to local array → render
3. **Edit**: form submit → `PUT /api/tasks/:id` → update local task → render
4. **Delete**: click Hapus → confirm dialog → `DELETE /api/tasks/:id` → filter local array → `closeModal(true)` → render
5. **Drag/Resize**: update local Date object immediately → save via `PUT` on `mouseup`
6. **Todos**: create/update/delete via API → render ulang
