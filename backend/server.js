const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
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

/* ---------- File Upload (Evidence Images) ---------- */

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(12).toString('hex') + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Format file tidak didukung. Gunakan: ' + allowed.join(', ')), false);
    cb(null, true);
  },
});

app.use('/uploads', express.static(uploadDir));

/* ---------- Tasks ---------- */

const CAT_LABELS = {
  desain: 'Desain',
  pengembangan: 'Pengembangan',
  pengujian: 'Pengujian',
  peluncuran: 'Peluncuran',
  lainnya: 'Lainnya',
  research: 'RnD (Research & Development)',
  operasional: 'Operasional',
};

function catLabel(slug) { return CAT_LABELS[slug] || slug; }

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

app.get('/api/tasks/:id/changelog', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const logs = getTaskLogs(taskId);
    res.json({ logs });
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
    const oldTask = await storage.getById(id);
    if (!oldTask) return res.status(404).json({ error: 'Task not found' });
    const task = await storage.update(id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (req.body.start !== undefined && req.body.start !== oldTask.start) {
      appendTaskLog(id, 'Perubahan Start Date dari ' + oldTask.start + ' ke ' + req.body.start);
    }
    if (req.body.end !== undefined && req.body.end !== oldTask.end) {
      appendTaskLog(id, 'Perubahan Due Date dari ' + oldTask.end + ' ke ' + req.body.end);
    }
    if (req.body.cat !== undefined && req.body.cat !== oldTask.cat) {
      appendTaskLog(id, 'Perubahan Kategori dari ' + catLabel(oldTask.cat) + ' ke ' + catLabel(req.body.cat));
    }
    if (req.body.assignee !== undefined && req.body.assignee !== oldTask.assignee) {
      const oldName = oldTask.assignee || '(kosong)';
      const newName = req.body.assignee || '(kosong)';
      appendTaskLog(id, 'Perubahan Penanggung Jawab dari ' + oldName + ' ke ' + newName);
    }

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

/* ---------- Task Changelog ---------- */

const taskChangelogPath = path.join(path.dirname(config.dataPath), 'task-changelog.json');

function appendTaskLog(taskId, action) {
  let logs = [];
  try {
    if (fs.existsSync(taskChangelogPath)) {
      logs = JSON.parse(fs.readFileSync(taskChangelogPath, 'utf-8'));
    }
  } catch (_) { logs = []; }
  logs.unshift({ taskId, action, actionAt: new Date().toISOString() });
  fs.writeFileSync(taskChangelogPath, JSON.stringify(logs, null, 2), 'utf-8');
}

function getTaskLogs(taskId) {
  let logs = [];
  try {
    if (fs.existsSync(taskChangelogPath)) {
      logs = JSON.parse(fs.readFileSync(taskChangelogPath, 'utf-8'));
    }
  } catch (_) { logs = []; }
  return logs.filter(l => l.taskId === taskId);
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
    appendTaskLog(taskId, 'Menambahkan Sub Task: "' + text + '"');
    res.status(201).json({ todo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/todos/:todoId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const todoId = parseInt(req.params.todoId, 10);
    const task = await storage.getById(taskId);
    const oldTodo = task?.todos?.find(t => t.id === todoId);
    const todo = await storage.updateTodo(taskId, todoId, req.body);
    if (!todo) return res.status(404).json({ error: 'Task or Todo not found' });

    if (oldTodo) {
      const label = '"' + oldTodo.text + '"';
      if (req.body.text !== undefined && req.body.text !== oldTodo.text) {
        appendTaskLog(taskId, 'Perubahan Sub Task ' + label + ' ke "' + req.body.text + '"');
      }
      if (req.body.due !== undefined && req.body.due !== oldTodo.due) {
        const oldDue = oldTodo.due || '(kosong)';
        const newDue = req.body.due || '(kosong)';
        appendTaskLog(taskId, 'Perubahan Due Date Sub Task ' + label + ' dari ' + oldDue + ' ke ' + newDue);
      }
      if (req.body.done !== undefined && req.body.done !== oldTodo.done) {
        const status = req.body.done ? 'ditandai selesai' : 'ditandai belum selesai';
        appendTaskLog(taskId, 'Sub Task ' + label + ' ' + status);
      }
    }

    res.json({ todo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id/todos/:todoId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const todoId = parseInt(req.params.todoId, 10);
    const task = await storage.getById(taskId);
    const oldTodo = task?.todos?.find(t => t.id === todoId);
    const ok = await storage.deleteTodo(taskId, todoId);
    if (!ok) return res.status(404).json({ error: 'Task or Todo not found' });
    if (oldTodo) {
      appendTaskLog(taskId, 'Menghapus Sub Task: "' + oldTodo.text + '"');
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Evidences ---------- */

app.post('/api/tasks/:id/evidences', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { type, link, keterangan } = req.body;
    const evType = type || 'link';
    if (!['link', 'text'].includes(evType)) return res.status(400).json({ error: 'type must be link or text' });
    const ev = await storage.addEvidence(taskId, { type: evType, link: link || '', keterangan: keterangan || '' });
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

app.post('/api/tasks/:id/evidences/image', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const message = err.message === 'Format file tidak didukung. Gunakan: .jpg, .jpeg, .png, .gif, .webp, .bmp, .svg'
        ? err.message : 'Gagal upload gambar: ' + err.message;
      return res.status(400).json({ error: message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    if (!req.file) return res.status(400).json({ error: 'File gambar harus diisi.' });
    const keterangan = req.body.keterangan || '';
    const ev = await storage.addEvidence(taskId, { type: 'image', link: 'uploads/' + req.file.filename, keterangan });
    if (!ev) return res.status(404).json({ error: 'Task not found' });
    res.status(201).json({ evidence: ev });
  } catch (err) {
    res.status(400).json({ error: 'Gagal upload gambar: ' + err.message });
  }
});

app.delete('/api/tasks/:id/evidences/:evId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const evId = parseInt(req.params.evId, 10);
    const task = await storage.getById(taskId);
    const ev = task?.evidences?.find(e => e.id === evId);
    const ok = await storage.deleteEvidence(taskId, evId);
    if (!ok) return res.status(404).json({ error: 'Task or Evidence not found' });
    if (ev && ev.type === 'image' && ev.link) {
      const filePath = path.join(__dirname, ev.link);
      fs.unlink(filePath, () => {});
    }
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
