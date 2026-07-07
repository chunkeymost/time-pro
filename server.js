const express = require('express');
const cors = require('cors');
const path = require('path');
const JsonStorage = require('./src/storage/JsonStorage');
const config = require('./src/config');

const app = express();
const storage = new JsonStorage(config.dataPath);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '.')));

/* ---------- Tasks ---------- */

app.get('/api/tasks', (req, res) => {
  try {
    const data = storage.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = storage.getById(parseInt(req.params.id, 10));
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { name, start, end, cat, assignee, progress } = req.body;
    if (!name || !start || !end) {
      return res.status(400).json({ error: 'name, start, and end are required' });
    }
    const task = storage.create({ name, start, end, cat, assignee, progress });
    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const task = storage.update(id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = storage.delete(id);
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Backup ---------- */

app.post('/api/backup', (req, res) => {
  const fs = require('fs');
  const path = require('path');
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
    res.json({ success: true, file: filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Todos ---------- */

app.post('/api/tasks/:id/todos', (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { text, due } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const todo = storage.addTodo(taskId, { text, due: due || null });
    if (!todo) return res.status(404).json({ error: 'Task not found' });
    res.status(201).json({ todo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id/todos/:todoId', (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const todoId = parseInt(req.params.todoId, 10);
    const todo = storage.updateTodo(taskId, todoId, req.body);
    if (!todo) return res.status(404).json({ error: 'Task or Todo not found' });
    res.json({ todo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id/todos/:todoId', (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const todoId = parseInt(req.params.todoId, 10);
    const ok = storage.deleteTodo(taskId, todoId);
    if (!ok) return res.status(404).json({ error: 'Task or Todo not found' });
    res.json({ success: true });
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
