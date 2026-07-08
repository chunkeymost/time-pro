const fs = require('fs');
const path = require('path');

class JsonStorage {
  constructor(filePath) {
    this.filePath = filePath;
    this._ensureDataDir();
  }

  _ensureDataDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        const seed = this._createSeedData();
        fs.writeFileSync(this.filePath, JSON.stringify(seed, null, 2), 'utf-8');
        return seed;
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to load data file, creating new one:', err.message);
      const seed = this._createSeedData();
      fs.writeFileSync(this.filePath, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
  }

  _save(data) {
    data.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  _createSeedData() {
    const now = new Date();
    const T = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const addDays = (d, n) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    };
    const ts = now.toISOString();

    return {
      metadata: { version: 1, lastSynced: null, updatedAt: ts },
      tasks: [
        { id: 1, name: 'Riset & Perencanaan', start: fmt(addDays(T, -10)), end: fmt(addDays(T, -3)), cat: 'lainnya', assignee: 'Dewi', progress: 100, todos: [], createdAt: ts, updatedAt: ts },
        { id: 2, name: 'Desain Wireframe', start: fmt(addDays(T, -4)), end: fmt(addDays(T, 4)), cat: 'desain', assignee: 'Rangga', progress: 60, todos: [], createdAt: ts, updatedAt: ts },
        {
          id: 3, name: 'Desain Visual UI', start: fmt(addDays(T, 2)), end: fmt(addDays(T, 9)), cat: 'desain', assignee: 'Sari', progress: 20,
          todos: [
            { id: 1, text: 'Buat wireframe halaman utama', done: true, due: fmt(addDays(T, -2)) },
            { id: 2, text: 'Buat mockup dashboard', done: false, due: fmt(addDays(T, 3)) },
            { id: 3, text: 'Revisi color palette', done: false, due: fmt(addDays(T, 6)) },
          ],
          createdAt: ts, updatedAt: ts,
        },
        { id: 4, name: 'Pengembangan Backend', start: fmt(addDays(T, 3)), end: fmt(addDays(T, 18)), cat: 'pengembangan', assignee: 'Bima', progress: 10, todos: [], createdAt: ts, updatedAt: ts },
        { id: 5, name: 'Pengembangan Frontend', start: fmt(addDays(T, 6)), end: fmt(addDays(T, 20)), cat: 'pengembangan', assignee: 'Putri', progress: 0, todos: [], createdAt: ts, updatedAt: ts },
        { id: 6, name: 'Pengujian QA', start: fmt(addDays(T, 18)), end: fmt(addDays(T, 25)), cat: 'pengujian', assignee: 'Fajar', progress: 0, todos: [], createdAt: ts, updatedAt: ts },
        { id: 7, name: 'Peluncuran ke Publik', start: fmt(addDays(T, 26)), end: fmt(addDays(T, 28)), cat: 'peluncuran', assignee: 'Tim', progress: 0, todos: [], createdAt: ts, updatedAt: ts },
      ],
      nextId: 8,
      nextTodoId: 4,
    };
  }

  getAll() {
    const data = this._load();
    return {
      tasks: data.tasks,
      nextId: data.nextId,
      nextTodoId: data.nextTodoId,
      metadata: data.metadata,
    };
  }

  getById(id) {
    const data = this._load();
    return data.tasks.find(t => t.id === id) || null;
  }

  create(taskData) {
    const data = this._load();
    const task = {
      id: data.nextId++,
      name: taskData.name || '',
      start: taskData.start,
      end: taskData.end,
      cat: taskData.cat || 'pengembangan',
      assignee: taskData.assignee || '',
      progress: typeof taskData.progress === 'number' ? taskData.progress : 0,
      todos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.tasks.push(task);
    this._save(data);
    return task;
  }

  update(id, taskData) {
    const data = this._load();
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const task = data.tasks[idx];
    if (taskData.name !== undefined) task.name = taskData.name;
    if (taskData.start !== undefined) task.start = taskData.start;
    if (taskData.end !== undefined) task.end = taskData.end;
    if (taskData.cat !== undefined) task.cat = taskData.cat;
    if (taskData.assignee !== undefined) task.assignee = taskData.assignee;
    if (taskData.progress !== undefined) task.progress = taskData.progress;
    task.updatedAt = new Date().toISOString();
    data.tasks[idx] = task;
    this._save(data);
    return task;
  }

  delete(id) {
    const data = this._load();
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    data.tasks.splice(idx, 1);
    this._save(data);
    return true;
  }

  addTodo(taskId, todoData) {
    const data = this._load();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return null;
    const todo = {
      id: data.nextTodoId++,
      text: todoData.text || '',
      done: todoData.done || false,
      due: todoData.due || null,
    };
    task.todos.push(todo);
    task.updatedAt = new Date().toISOString();
    this._save(data);
    return todo;
  }

  updateTodo(taskId, todoId, todoData) {
    const data = this._load();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return null;
    const todo = task.todos.find(t => t.id === todoId);
    if (!todo) return null;
    if (todoData.text !== undefined) todo.text = todoData.text;
    if (todoData.done !== undefined) todo.done = todoData.done;
    if (todoData.due !== undefined) todo.due = todoData.due;
    task.updatedAt = new Date().toISOString();
    this._save(data);
    return todo;
  }

  deleteTodo(taskId, todoId) {
    const data = this._load();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return false;
    const idx = task.todos.findIndex(t => t.id === todoId);
    if (idx === -1) return false;
    task.todos.splice(idx, 1);
    task.updatedAt = new Date().toISOString();
    this._save(data);
    return true;
  }

  addEvidence(taskId, evData) {
    const data = this._load();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return null;
    if (!task.evidences) task.evidences = [];
    const ev = {
      id: data.nextEvidenceId || 1,
      link: evData.link || '',
      keterangan: evData.keterangan || '',
      created_at: new Date().toISOString(),
    };
    data.nextEvidenceId = (data.nextEvidenceId || 1) + 1;
    task.evidences.push(ev);
    task.updatedAt = new Date().toISOString();
    this._save(data);
    return ev;
  }

  updateEvidence(taskId, evId, evData) {
    const data = this._load();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return null;
    if (!task.evidences) return null;
    const ev = task.evidences.find(e => e.id === evId);
    if (!ev) return null;
    if (evData.link !== undefined) ev.link = evData.link;
    if (evData.keterangan !== undefined) ev.keterangan = evData.keterangan;
    task.updatedAt = new Date().toISOString();
    this._save(data);
    return ev;
  }

  deleteEvidence(taskId, evId) {
    const data = this._load();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return false;
    if (!task.evidences) return false;
    const idx = task.evidences.findIndex(e => e.id === evId);
    if (idx === -1) return false;
    task.evidences.splice(idx, 1);
    task.updatedAt = new Date().toISOString();
    this._save(data);
    return true;
  }
}

module.exports = JsonStorage;
