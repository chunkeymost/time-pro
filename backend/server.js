const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

/* ---------- Start ---------- */

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Time Pro API running at http://localhost:${PORT}`);
});
