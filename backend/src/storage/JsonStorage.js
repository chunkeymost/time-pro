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
    return {
      metadata: { version: 1, lastSynced: null, updatedAt: new Date().toISOString() },
      tasks: [],
      nextId: 1,
      nextTodoId: 1,
      nextEvidenceId: 1,
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
