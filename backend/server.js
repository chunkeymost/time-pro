const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const JsonStorage = require('./src/storage/JsonStorage');
const MysqlStorage = require('./src/storage/MysqlStorage');
const config = require('./src/config');

const app = express();

const storage = process.env.STORAGE === 'mysql'
  ? new MysqlStorage(config.mysql)
  : new JsonStorage(config.dataPath);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ---------- Tasks ---------- */

app.get('/api/tasks', async (req, res) => {
  try {
    const data = await storage.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await storage.getById(parseInt(req.params.id, 10));
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { name, start, end, cat, assignee, progress } = req.body;
    if (!name || !start || !end) {
      return res.status(400).json({ error: 'name, start, and end are required' });
    }
    const task = await storage.create({ name, start, end, cat, assignee, progress });
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const task = await storage.update(id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await storage.delete(id);
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Backup ---------- */

app.post('/api/backup', async (req, res) => {
  const dataDir = path.dirname(config.dataPath);
  const now = new Date();
  const y = now.getFullYear();
  const M = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  const filename = `task-${y}${M}${d}-${h}${m}${s}.json`;
  const dest = path.join(dataDir, filename);
  try {
    fs.copyFileSync(config.dataPath, dest);
    appendRestoreLog('BackedUp', filename);
    res.json({ success: true, file: filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Restore Log Helper ---------- */

const restoreLogPath = path.join(path.dirname(config.dataPath), 'restore-log.json');

function appendRestoreLog(status, filename) {
  let log = [];
  try {
    if (fs.existsSync(restoreLogPath)) {
      log = JSON.parse(fs.readFileSync(restoreLogPath, 'utf-8'));
    }
  } catch (_) { log = []; }
  log.unshift({ status, filename, restoreAt: new Date().toISOString() });
  fs.writeFileSync(restoreLogPath, JSON.stringify(log, null, 2), 'utf-8');
}

/* ---------- Backups ---------- */

app.get('/api/backups', async (req, res) => {
  const dataDir = path.dirname(config.dataPath);
  try {
    const files = fs.readdirSync(dataDir)
      .filter(f => /^task-\d{8}-\d{6}\.json$/.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(dataDir, f));
        const match = f.match(/^task-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/);
        const date = match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}` : '';
        return { filename: f, date, size: stat.size };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    res.json({ backups: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/restore-log', async (req, res) => {
  try {
    if (!fs.existsSync(restoreLogPath)) {
      return res.json({ restoreLog: [] });
    }
    const log = JSON.parse(fs.readFileSync(restoreLogPath, 'utf-8'));
    res.json({ restoreLog: log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/restore', async (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename is required' });
  const dataDir = path.dirname(config.dataPath);
  const srcPath = path.join(dataDir, filename);
  const destPath = config.dataPath;
  try {
    if (!fs.existsSync(srcPath)) {
      appendRestoreLog('Failed', filename);
      return res.status(404).json({ error: 'File not found' });
    }
    const srcData = JSON.parse(fs.readFileSync(srcPath, 'utf-8'));
    if (!srcData.tasks || !Array.isArray(srcData.tasks)) {
      appendRestoreLog('Failed', filename);
      return res.status(400).json({ error: 'Invalid backup file: no tasks array' });
    }
    const currentData = JSON.parse(fs.readFileSync(destPath, 'utf-8'));
    currentData.tasks = srcData.tasks;
    currentData.nextId = srcData.nextId || srcData.tasks.length + 1;
    currentData.nextTodoId = srcData.nextTodoId || 1;
    currentData.nextEvidenceId = srcData.nextEvidenceId || 1;
    currentData.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(destPath, JSON.stringify(currentData, null, 2), 'utf-8');
    appendRestoreLog('Restored', filename);
    res.json({ success: true, taskCount: srcData.tasks.length });
  } catch (err) {
    appendRestoreLog('Failed', filename);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Todos ---------- */

app.post('/api/tasks/:id/todos', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { text, due } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const todo = await storage.addTodo(taskId, { text, due: due || null });
    if (!todo) return res.status(404).json({ error: 'Task not found' });
    res.status(201).json({ todo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/todos/:todoId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const todoId = parseInt(req.params.todoId, 10);
    const todo = await storage.updateTodo(taskId, todoId, req.body);
    if (!todo) return res.status(404).json({ error: 'Task or Todo not found' });
    res.json({ todo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id/todos/:todoId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const todoId = parseInt(req.params.todoId, 10);
    const ok = await storage.deleteTodo(taskId, todoId);
    if (!ok) return res.status(404).json({ error: 'Task or Todo not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Evidences ---------- */

app.post('/api/tasks/:id/evidences', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { link, keterangan } = req.body;
    if (!link) return res.status(400).json({ error: 'link is required' });
    const ev = await storage.addEvidence(taskId, { link, keterangan: keterangan || '' });
    if (!ev) return res.status(404).json({ error: 'Task not found' });
    res.status(201).json({ evidence: ev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/evidences/:evId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const evId = parseInt(req.params.evId, 10);
    const ev = await storage.updateEvidence(taskId, evId, req.body);
    if (!ev) return res.status(404).json({ error: 'Task or Evidence not found' });
    res.json({ evidence: ev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id/evidences/:evId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const evId = parseInt(req.params.evId, 10);
    const ok = await storage.deleteEvidence(taskId, evId);
    if (!ok) return res.status(404).json({ error: 'Task or Evidence not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Metadata ---------- */

app.get('/api/metadata', async (req, res) => {
  try {
    const metadata = await storage.getMetadata();
    res.json({ metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/metadata', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const metadata = await storage.updateMetadata({ title: title.trim() });
    res.json({ metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Sync stub ---------- */

app.post('/api/sync/commit', (req, res) => {
  res.json({ message: 'Sync akan tersedia di Phase 2 setelah integrasi MySQL.' });
});

/* ---------- Restore JSON upload to MySQL ---------- */

app.post('/api/restore/upload', async (req, res) => {
  if (process.env.STORAGE !== 'mysql') {
    return res.status(400).json({ error: 'Restore upload hanya tersedia saat STORAGE=mysql' });
  }

  const { tasks, nextId, nextTodoId } = req.body;
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Body harus berisi array tasks' });
  }

  const conn = await mysql.createConnection(config.mysql);
  try {
    const [catRows] = await conn.execute('SELECT COUNT(*) AS cnt FROM categories');
    if (catRows[0].cnt === 0) {
      return res.status(400).json({ error: 'Tabel categories kosong. Jalankan migrasi terlebih dahulu.' });
    }

    const [cats] = await conn.execute('SELECT id, slug FROM categories');
    const catMap = {};
    for (const c of cats) catMap[c.slug] = c.id;

    await conn.beginTransaction();

    let taskCount = 0;
    let todoCount = 0;
    let evidenceCount = 0;

    for (const task of tasks) {
      let catId = catMap[task.cat];
      if (!catId) {
        const catName = task.cat.charAt(0).toUpperCase() + task.cat.slice(1);
        await conn.execute(
          'INSERT IGNORE INTO categories (slug, name) VALUES (?, ?)',
          [task.cat, catName]
        );
        const [newCat] = await conn.execute('SELECT id FROM categories WHERE slug = ?', [task.cat]);
        if (newCat.length === 0) continue;
        catMap[task.cat] = newCat[0].id;
        catId = newCat[0].id;
      }

      const createdAt = task.createdAt
        ? new Date(task.createdAt).toISOString().slice(0, 19).replace('T', ' ')
        : new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updatedAt = task.updatedAt
        ? new Date(task.updatedAt).toISOString().slice(0, 19).replace('T', ' ')
        : createdAt;

      await conn.execute(
        `INSERT INTO tasks (id, name, start_date, end_date, category_id, assignee, progress, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           start_date = VALUES(start_date),
           end_date = VALUES(end_date),
           category_id = VALUES(category_id),
           assignee = VALUES(assignee),
           progress = VALUES(progress),
           updated_at = VALUES(updated_at)`,
        [
          task.id, task.name, task.start, task.end, catId,
          task.assignee || '', task.progress || 0, createdAt, updatedAt,
        ]
      );
      taskCount++;

      if (task.todos && task.todos.length > 0) {
        for (const todo of task.todos) {
          await conn.execute(
            `INSERT INTO todos (id, task_id, text, done, due_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
               text = VALUES(text),
               done = VALUES(done),
               due_date = VALUES(due_date),
               updated_at = NOW()`,
            [todo.id, task.id, todo.text, todo.done ? 1 : 0, todo.due || null]
          );
          todoCount++;
        }
      }

      if (task.evidences && task.evidences.length > 0) {
        for (const ev of task.evidences) {
          const evCreatedAt = ev.created_at
            ? new Date(ev.created_at).toISOString().slice(0, 19).replace('T', ' ')
            : new Date().toISOString().slice(0, 19).replace('T', ' ');

          await conn.execute(
            `INSERT INTO evidences (id, task_id, link, keterangan, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               link = VALUES(link),
               keterangan = VALUES(keterangan),
               updated_at = NOW()`,
            [ev.id, task.id, ev.link || '', ev.keterangan || '', evCreatedAt]
          );
          evidenceCount++;
        }
      }
    }

    await conn.execute(
      "INSERT INTO app_metadata (`key`, `value`) VALUES ('json_seeded_at', NOW()) " +
      "ON DUPLICATE KEY UPDATE `value` = NOW()"
    );

    await conn.commit();
    res.json({ success: true, taskCount, todoCount, evidenceCount });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    await conn.end();
  }
});

/* ---------- Auto-migrate (MySQL only) ---------- */

async function autoMigrate() {
  if (process.env.STORAGE !== 'mysql') return;
  try {
    const { migrate } = require('./src/schema/migrate');
    await migrate();
    console.log('Auto-migration completed.');
  } catch (err) {
    console.error('Auto-migration failed:', err.message);
  }
}

/* ---------- Start ---------- */

const PORT = config.port;
autoMigrate().then(() => {
  app.listen(PORT, () => {
    console.log(`Time Pro API running at http://localhost:${PORT}`);
  });
});
