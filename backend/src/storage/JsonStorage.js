const fs = require('fs');
const path = require('path');

function momString(value) {
  return value === undefined || value === null ? '' : String(value);
}

function normalizeMomAttendees(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    name: momString(item && item.name),
    role: momString(item && item.role),
    organization: momString(item && item.organization),
    attendance: momString(item && item.attendance) || 'present',
  }));
}

function normalizeMomAgenda(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    topic: momString(item && item.topic),
    presenter: momString(item && item.presenter),
    duration: momString(item && item.duration),
  }));
}

function normalizeMomDiscussions(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    agendaTopic: momString(item && item.agendaTopic),
    notes: momString(item && item.notes),
  }));
}

function normalizeMomDecisions(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    text: momString(typeof item === 'string' ? item : item && item.text),
  }));
}

function normalizeMomActions(list) {
  return (Array.isArray(list) ? list : []).map(item => ({
    description: momString(item && item.description),
    pic: momString(item && item.pic),
    dueDate: momString(item && item.dueDate),
    status: momString(item && item.status) || 'open',
  }));
}

function normalizeMomSignature(sig) {
  return {
    name: momString(sig && sig.name),
    role: momString(sig && sig.role),
    date: momString(sig && sig.date),
    signature: momString(sig && sig.signature),
  };
}

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
      metadata: { version: 1, lastSynced: null, updatedAt: new Date().toISOString(), title: 'Timeframe as a System Analyst' },
      tasks: [],
      nextId: 1,
      nextTodoId: 1,
      nextEvidenceId: 1,
      holidays: [],
      nextHolidayId: 1,
    };
  }

  getAll() {
    const data = this._load();
    const meta = data.metadata || {};
    return {
      tasks: data.tasks,
      nextId: data.nextId,
      nextTodoId: data.nextTodoId,
      holidays: data.holidays || [],
      metadata: { version: meta.version || 1, lastSynced: meta.lastSynced || null, updatedAt: meta.updatedAt || null, title: meta.title || 'Timeframe as a System Analyst' },
    };
  }

  getHolidays() {
    const data = this._load();
    return data.holidays || [];
  }

  createHoliday(holidayData) {
    const data = this._load();
    if (!data.holidays) data.holidays = [];
    const holiday = {
      id: data.nextHolidayId || 1,
      start: holidayData.start,
      end: holidayData.end || holidayData.start,
      keterangan: holidayData.keterangan || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.nextHolidayId = (data.nextHolidayId || 1) + 1;
    data.holidays.push(holiday);
    this._save(data);
    return holiday;
  }

  updateHoliday(id, holidayData) {
    const data = this._load();
    if (!data.holidays) return null;
    const holiday = data.holidays.find(h => h.id === id);
    if (!holiday) return null;
    if (holidayData.start !== undefined) holiday.start = holidayData.start;
    if (holidayData.end !== undefined) holiday.end = holidayData.end;
    if (holidayData.keterangan !== undefined) holiday.keterangan = holidayData.keterangan;
    holiday.updatedAt = new Date().toISOString();
    this._save(data);
    return holiday;
  }

  deleteHoliday(id) {
    const data = this._load();
    if (!data.holidays) return false;
    const idx = data.holidays.findIndex(h => h.id === id);
    if (idx === -1) return false;
    data.holidays.splice(idx, 1);
    this._save(data);
    return true;
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
      evidences: [],
      held: false,
      heldAt: null,
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

  toggleHold(taskId) {
    const data = this._load();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return null;
    
    const now = new Date().toISOString();
    const wasHeld = task.held === true;
    task.held = !wasHeld;
    task.heldAt = task.held ? now : null;
    task.updatedAt = now;
    
    const action = task.held 
      ? 'Tugas di-hold (dihentikan sementara)' 
      : 'Tugas dibuka kembali (dilanjutkan)';
    this.addTaskLog(taskId, action);
    
    this._save(data);
    return { held: task.held, heldAt: task.heldAt };
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
      type: evData.type || 'link',
      link: evData.link || null,
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
    if (evData.type !== undefined) ev.type = evData.type;
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

  _getChangelogPath() {
    return path.join(path.dirname(this.filePath), 'task-changelog.json');
  }

  addTaskLog(taskId, action) {
    const logPath = this._getChangelogPath();
    let logs = [];
    try {
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      }
    } catch (_) { logs = []; }
    logs.unshift({ taskId, action, actionAt: new Date().toISOString() });
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');
  }

  getTaskLogs(taskId) {
    const logPath = this._getChangelogPath();
    let logs = [];
    try {
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      }
    } catch (_) { logs = []; }
    return logs.filter(l => l.taskId === taskId);
  }

  _getEvidenceChangelogPath() {
    return path.join(path.dirname(this.filePath), 'evidence-changelog.json');
  }

  addEvidenceLog(taskId, evidenceId, action) {
    const logPath = this._getEvidenceChangelogPath();
    let logs = [];
    try {
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      }
    } catch (_) { logs = []; }
    logs.unshift({ taskId, evidenceId, action, actionAt: new Date().toISOString() });
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');
  }

  getEvidenceLogs(taskId) {
    const logPath = this._getEvidenceChangelogPath();
    let logs = [];
    try {
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      }
    } catch (_) { logs = []; }
    return logs.filter(l => l.taskId === taskId);
  }

  _getRestoreLogPath() {
    return path.join(path.dirname(this.filePath), 'restore-log.json');
  }

  addRestoreLog(status, filename) {
    const logPath = this._getRestoreLogPath();
    let logs = [];
    try {
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      }
    } catch (_) { logs = []; }
    logs.unshift({ status, filename, restoreAt: new Date().toISOString() });
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');
  }

  getRestoreLogs() {
    const logPath = this._getRestoreLogPath();
    let logs = [];
    try {
      if (fs.existsSync(logPath)) {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      }
    } catch (_) { logs = []; }
    return logs;
  }

  getMetadata() {
    const data = this._load();
    const meta = data.metadata || {};
    return { version: meta.version || 1, lastSynced: meta.lastSynced || null, updatedAt: meta.updatedAt || null, title: meta.title || 'Timeframe as a System Analyst' };
  }

  updateMetadata(updates) {
    const data = this._load();
    if (!data.metadata) {
      data.metadata = { version: 1, lastSynced: null, updatedAt: null, title: 'Timeframe as a System Analyst' };
    }
    if (updates.title !== undefined) data.metadata.title = updates.title;
    this._save(data);
    return data.metadata;
  }

  /* ---------- Daily Tasks ---------- */
  _getDailyTasksPath() {
    return path.join(path.dirname(this.filePath), 'daily-tasks.json');
  }

  _loadDailyTasks() {
    try {
      const p = this._getDailyTasksPath();
      if (!fs.existsSync(p)) {
        const seed = { dailyTasks: [], nextId: 1 };
        fs.writeFileSync(p, JSON.stringify(seed, null, 2), 'utf-8');
        return seed;
      }
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to load daily tasks:', err.message);
      const seed = { dailyTasks: [], nextId: 1 };
      fs.writeFileSync(this._getDailyTasksPath(), JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
  }

  _saveDailyTasks(data) {
    fs.writeFileSync(this._getDailyTasksPath(), JSON.stringify(data, null, 2), 'utf-8');
  }

  getDailyTasks() {
    const data = this._loadDailyTasks();
    return data.dailyTasks || [];
  }

  createDailyTask(dtData) {
    const data = this._loadDailyTasks();
    const dt = {
      id: data.nextId++,
      taskId: dtData.taskId || null,
      taskName: dtData.taskName || '',
      status: dtData.status || 'not_start',
      date: dtData.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.dailyTasks.push(dt);
    this._saveDailyTasks(data);
    return dt;
  }

  updateDailyTask(id, dtData) {
    const data = this._loadDailyTasks();
    const idx = data.dailyTasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const dt = data.dailyTasks[idx];
    if (dtData.taskId !== undefined) dt.taskId = dtData.taskId;
    if (dtData.taskName !== undefined) dt.taskName = dtData.taskName;
    if (dtData.status !== undefined) dt.status = dtData.status;
    if (dtData.date !== undefined) dt.date = dtData.date;
    dt.updatedAt = new Date().toISOString();
    data.dailyTasks[idx] = dt;
    this._saveDailyTasks(data);
    return dt;
  }

  deleteDailyTask(id) {
    const data = this._loadDailyTasks();
    const idx = data.dailyTasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    data.dailyTasks.splice(idx, 1);
    this._saveDailyTasks(data);
    return true;
  }

  _getDailyHistoryPath() {
    return path.join(path.dirname(this.filePath), 'daily-tasks-history.json');
  }

  _loadDailyHistory() {
    try {
      const p = this._getDailyHistoryPath();
      if (!fs.existsSync(p)) return [];
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to load daily task history:', err.message);
      return [];
    }
  }

  _saveDailyHistory(history) {
    fs.writeFileSync(this._getDailyHistoryPath(), JSON.stringify(history, null, 2), 'utf-8');
  }

  _localDateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  ensureDailyRollover() {
    const data = this._loadDailyTasks();
    const todayKey = this._localDateKey();

    // First run: just record today, nothing to close yet
    if (!data.lastSnapshotDate) {
      data.lastSnapshotDate = todayKey;
      this._saveDailyTasks(data);
      return null;
    }

    // Same day: nothing to do
    if (data.lastSnapshotDate === todayKey) return null;

    // Day changed: snapshot the closing day's list (only if it has rows)
    let snapshot = null;
    const rows = data.dailyTasks || [];
    if (rows.length > 0) {
      snapshot = {
        date: data.lastSnapshotDate,
        snapshotAt: new Date().toISOString(),
        dailyTasks: rows,
      };
      const history = this._loadDailyHistory();
      history.unshift(snapshot);
      this._saveDailyHistory(history);
    }

    // Reset active list for the new day (nextId is preserved)
    data.dailyTasks = [];
    data.lastSnapshotDate = todayKey;
    this._saveDailyTasks(data);
    return snapshot;
  }

  getDailyTaskHistory() {
    return this._loadDailyHistory();
  }

  /* ---------- Minutes of Meeting ---------- */
  _getMomPath() {
    return path.join(path.dirname(this.filePath), 'mom.json');
  }

  _loadMom() {
    try {
      const p = this._getMomPath();
      if (!fs.existsSync(p)) {
        const seed = { meetings: [], nextId: 1 };
        fs.writeFileSync(p, JSON.stringify(seed, null, 2), 'utf-8');
        return seed;
      }
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.meetings)) parsed.meetings = [];
      if (!parsed.nextId) parsed.nextId = 1;
      return parsed;
    } catch (err) {
      console.error('Failed to load MoM data:', err.message);
      const seed = { meetings: [], nextId: 1 };
      fs.writeFileSync(this._getMomPath(), JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
  }

  _saveMom(data) {
    fs.writeFileSync(this._getMomPath(), JSON.stringify(data, null, 2), 'utf-8');
  }

  _nextMomNumber(meetings, year) {
    const prefix = `MoM/${year}/`;
    let max = 0;
    (meetings || []).forEach(m => {
      if (m && typeof m.momNumber === 'string' && m.momNumber.startsWith(prefix)) {
        const n = parseInt(m.momNumber.slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  _normalizeMomMeeting(input, existing) {
    const data = input || {};
    const base = existing || {};
    const now = new Date().toISOString();
    return {
      momNumber: data.momNumber !== undefined ? momString(data.momNumber) : momString(base.momNumber),
      title: data.title !== undefined ? momString(data.title).trim() : momString(base.title),
      meetingType: data.meetingType !== undefined ? momString(data.meetingType) : (base.meetingType || 'internal'),
      date: data.date !== undefined ? momString(data.date).slice(0, 10) : momString(base.date),
      startTime: data.startTime !== undefined ? momString(data.startTime) : momString(base.startTime),
      endTime: data.endTime !== undefined ? momString(data.endTime) : momString(base.endTime),
      location: data.location !== undefined ? momString(data.location) : momString(base.location),
      chair: data.chair !== undefined ? momString(data.chair) : momString(base.chair),
      notetaker: data.notetaker !== undefined ? momString(data.notetaker) : momString(base.notetaker),
      status: (data.status !== undefined ? momString(data.status) : (base.status || 'draft')) === 'final' ? 'final' : 'draft',
      attendees: data.attendees !== undefined ? normalizeMomAttendees(data.attendees) : normalizeMomAttendees(base.attendees),
      agenda: data.agenda !== undefined ? normalizeMomAgenda(data.agenda) : normalizeMomAgenda(base.agenda),
      discussions: data.discussions !== undefined ? normalizeMomDiscussions(data.discussions) : normalizeMomDiscussions(base.discussions),
      decisions: data.decisions !== undefined ? normalizeMomDecisions(data.decisions) : normalizeMomDecisions(base.decisions),
      actionItems: data.actionItems !== undefined ? normalizeMomActions(data.actionItems) : normalizeMomActions(base.actionItems),
      nextSteps: data.nextSteps !== undefined ? momString(data.nextSteps) : momString(base.nextSteps),
      nextMeetingDate: data.nextMeetingDate !== undefined ? momString(data.nextMeetingDate).slice(0, 10) : momString(base.nextMeetingDate),
      nextMeetingTime: data.nextMeetingTime !== undefined ? momString(data.nextMeetingTime) : momString(base.nextMeetingTime),
      nextMeetingLocation: data.nextMeetingLocation !== undefined ? momString(data.nextMeetingLocation) : momString(base.nextMeetingLocation),
      preparedBy: normalizeMomSignature(data.preparedBy !== undefined ? data.preparedBy : base.preparedBy),
      approvedBy: normalizeMomSignature(data.approvedBy !== undefined ? data.approvedBy : base.approvedBy),
      createdAt: base.createdAt || now,
      updatedAt: now,
    };
  }

  getMomMeetings() {
    const data = this._loadMom();
    return data.meetings.slice().sort((a, b) => {
      const da = momString(a.date);
      const db = momString(b.date);
      if (da === db) return (b.id || 0) - (a.id || 0);
      return db.localeCompare(da);
    });
  }

  getMomMeetingById(id) {
    const data = this._loadMom();
    return data.meetings.find(m => m.id === id) || null;
  }

  createMomMeeting(input) {
    const data = this._loadMom();
    const year = momString(input && input.date).slice(0, 4) || String(new Date().getFullYear());
    const meeting = this._normalizeMomMeeting(input, null);
    meeting.id = data.nextId++;
    if (!meeting.momNumber) {
      meeting.momNumber = this._nextMomNumber(data.meetings, year);
    }
    data.meetings.push(meeting);
    this._saveMom(data);
    return meeting;
  }

  updateMomMeeting(id, input) {
    const data = this._loadMom();
    const idx = data.meetings.findIndex(m => m.id === id);
    if (idx === -1) return null;
    const merged = this._normalizeMomMeeting(input, data.meetings[idx]);
    merged.id = data.meetings[idx].id;
    data.meetings[idx] = merged;
    this._saveMom(data);
    return merged;
  }

  deleteMomMeeting(id) {
    const data = this._loadMom();
    const idx = data.meetings.findIndex(m => m.id === id);
    if (idx === -1) return false;
    data.meetings.splice(idx, 1);
    this._saveMom(data);
    return true;
  }
}

module.exports = JsonStorage;
