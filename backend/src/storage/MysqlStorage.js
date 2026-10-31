const mysql = require('mysql2/promise');

const MOM_HEADER_COLUMNS = `id, mom_number, title, meeting_type, meeting_date, start_time, end_time, location, chair, notetaker, status, next_steps, next_meeting_date, next_meeting_time, next_meeting_location, prepared_by_name, prepared_by_role, prepared_by_date, prepared_by_signature, approved_by_name, approved_by_role, approved_by_date, approved_by_signature, created_at, updated_at`;

function momDateStr(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function momTimeStr(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

function momIso(value) {
  return value instanceof Date ? value.toISOString() : (value || null);
}

function momStr(value) {
  return value === undefined || value === null ? '' : String(value);
}

class MysqlStorage {
  constructor(mysqlConfig) {
    this.config = mysqlConfig;
  }

  async _getConnection() {
    return mysql.createConnection(this.config);
  }

  async getAll() {
    const conn = await this._getConnection();
    try {
      const [tasks] = await conn.execute(
        'SELECT id, name, start_date, end_date, category_id, assignee, progress, created_at, updated_at FROM tasks WHERE deleted_at IS NULL ORDER BY id'
      );
      const [todos] = await conn.execute(
        'SELECT id, task_id, text, done, due_date FROM todos WHERE deleted_at IS NULL ORDER BY id'
      );
      const todoMap = {};
      for (const t of todos) {
        if (!todoMap[t.task_id]) todoMap[t.task_id] = [];
        todoMap[t.task_id].push({
          id: t.id,
          text: t.text,
          done: !!t.done,
          due: t.due_date ? t.due_date.toISOString().slice(0, 10) : null,
        });
      }

      const [evidences] = await conn.execute(
        'SELECT id, type, task_id, link, keterangan, created_at FROM evidences WHERE deleted_at IS NULL ORDER BY id'
      );
      const evidenceMap = {};
      for (const e of evidences) {
        if (!evidenceMap[e.task_id]) evidenceMap[e.task_id] = [];
        evidenceMap[e.task_id].push({
          id: e.id,
          type: e.type,
          link: e.link,
          keterangan: e.keterangan,
          created_at: e.created_at ? e.created_at.toISOString() : null,
        });
      }

      const [catRows] = await conn.execute('SELECT id, slug FROM categories');
      const catMap = {};
      for (const c of catRows) catMap[c.id] = c.slug;

      const [maxTaskId] = await conn.execute('SELECT MAX(id) AS maxId FROM tasks');
      const [maxTodoId] = await conn.execute('SELECT MAX(id) AS maxId FROM todos');
      const [maxEvidenceId] = await conn.execute('SELECT MAX(id) AS maxId FROM evidences');
      const [metaRows] = await conn.execute("SELECT `key`, `value` FROM app_metadata");

      const metadata = { version: 1, lastSynced: null, updatedAt: null, title: 'Timeframe as a System Analyst' };
      for (const row of metaRows) {
        if (row.key === 'lastSynced') metadata.lastSynced = row.value;
        if (row.key === 'updatedAt') metadata.updatedAt = row.value;
        if (row.key === 'title') metadata.title = row.value;
      }

      return {
        tasks: tasks.map(t => ({
          id: t.id,
          name: t.name,
          start: t.start_date.toISOString().slice(0, 10),
          end: t.end_date.toISOString().slice(0, 10),
          cat: catMap[t.category_id] || '',
          category_id: t.category_id,
          assignee: t.assignee,
          progress: t.progress,
          todos: todoMap[t.id] || [],
          evidences: evidenceMap[t.id] || [],
          createdAt: t.created_at ? t.created_at.toISOString() : null,
          updatedAt: t.updated_at ? t.updated_at.toISOString() : null,
        })),
        nextId: (maxTaskId[0].maxId || 0) + 1,
        nextTodoId: (maxTodoId[0].maxId || 0) + 1,
        nextEvidenceId: (maxEvidenceId[0].maxId || 0) + 1,
        holidays: await this.getHolidays(conn),
        metadata,
      };
    } finally {
      await conn.end();
    }
  }

  async getById(id) {
    const conn = await this._getConnection();
    try {
      const [tasks] = await conn.execute(
        'SELECT id, name, start_date, end_date, category_id, assignee, progress, created_at, updated_at FROM tasks WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      if (tasks.length === 0) return null;
      const t = tasks[0];

      const [catRows] = await conn.execute('SELECT slug FROM categories WHERE id = ?', [t.category_id]);
      const catSlug = catRows.length > 0 ? catRows[0].slug : '';

      const [todos] = await conn.execute(
        'SELECT id, text, done, due_date FROM todos WHERE task_id = ? AND deleted_at IS NULL',
        [id]
      );

      const [evidences] = await conn.execute(
        'SELECT id, type, link, keterangan, created_at FROM evidences WHERE task_id = ? AND deleted_at IS NULL',
        [id]
      );

      return {
        id: t.id,
        name: t.name,
        start: t.start_date.toISOString().slice(0, 10),
        end: t.end_date.toISOString().slice(0, 10),
        cat: catSlug,
        category_id: t.category_id,
        assignee: t.assignee,
        progress: t.progress,
        todos: todos.map(td => ({
          id: td.id,
          text: td.text,
          done: !!td.done,
          due: td.due_date ? td.due_date.toISOString().slice(0, 10) : null,
        })),
        evidences: evidences.map(e => ({
          id: e.id,
          type: e.type,
          link: e.link,
          keterangan: e.keterangan,
          created_at: e.created_at ? e.created_at.toISOString() : null,
        })),
        createdAt: t.created_at ? t.created_at.toISOString() : null,
        updatedAt: t.updated_at ? t.updated_at.toISOString() : null,
      };
    } finally {
      await conn.end();
    }
  }

  async create(taskData) {
    const conn = await this._getConnection();
    try {
      const categoryId = taskData.category_id || await this._resolveCategory(taskData.cat, conn);
      const [result] = await conn.execute(
        `INSERT INTO tasks (name, start_date, end_date, category_id, assignee, progress)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          taskData.name || '',
          taskData.start,
          taskData.end,
          categoryId,
          taskData.assignee || '',
          typeof taskData.progress === 'number' ? taskData.progress : 0,
        ]
      );
      return this.getById(result.insertId);
    } finally {
      await conn.end();
    }
  }

  async update(id, taskData) {
    const conn = await this._getConnection();
    try {
      const sets = [];
      const params = [];
      if (taskData.name !== undefined) { sets.push('name = ?'); params.push(taskData.name); }
      if (taskData.start !== undefined) { sets.push('start_date = ?'); params.push(taskData.start); }
      if (taskData.end !== undefined) { sets.push('end_date = ?'); params.push(taskData.end); }
      if (taskData.cat !== undefined) {
        const catId = await this._resolveCategory(taskData.cat, conn);
        sets.push('category_id = ?');
        params.push(catId);
      }
      if (taskData.category_id !== undefined) { sets.push('category_id = ?'); params.push(taskData.category_id); }
      if (taskData.assignee !== undefined) { sets.push('assignee = ?'); params.push(taskData.assignee); }
      if (taskData.progress !== undefined) { sets.push('progress = ?'); params.push(taskData.progress); }

      if (sets.length === 0) return this.getById(id);

      params.push(id);
      await conn.execute(
        `UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        params
      );
      return this.getById(id);
    } finally {
      await conn.end();
    }
  }

  async delete(id) {
    const conn = await this._getConnection();
    try {
      const [result] = await conn.execute(
        'UPDATE tasks SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      await conn.end();
    }
  }

  async addTodo(taskId, todoData) {
    const conn = await this._getConnection();
    try {
      const [result] = await conn.execute(
        `INSERT INTO todos (task_id, text, done, due_date)
         VALUES (?, ?, ?, ?)`,
        [
          taskId,
          todoData.text || '',
          todoData.done || false,
          todoData.due || null,
        ]
      );
      const todoId = result.insertId;
      return {
        id: todoId,
        text: todoData.text || '',
        done: todoData.done || false,
        due: todoData.due || null,
      };
    } finally {
      await conn.end();
    }
  }

  async updateTodo(taskId, todoId, todoData) {
    const conn = await this._getConnection();
    try {
      const sets = [];
      const params = [];
      if (todoData.text !== undefined) { sets.push('text = ?'); params.push(todoData.text); }
      if (todoData.done !== undefined) { sets.push('done = ?'); params.push(todoData.done ? 1 : 0); }
      if (todoData.due !== undefined) { sets.push('due_date = ?'); params.push(todoData.due || null); }

      if (sets.length === 0) return null;

      params.push(todoId, taskId);
      const [result] = await conn.execute(
        `UPDATE todos SET ${sets.join(', ')} WHERE id = ? AND task_id = ? AND deleted_at IS NULL`,
        params
      );
      if (result.affectedRows === 0) return null;

      return {
        id: todoId,
        text: todoData.text !== undefined ? todoData.text : undefined,
        done: todoData.done !== undefined ? todoData.done : undefined,
        due: todoData.due !== undefined ? todoData.due : undefined,
      };
    } finally {
      await conn.end();
    }
  }

  async deleteTodo(taskId, todoId) {
    const conn = await this._getConnection();
    try {
      const [result] = await conn.execute(
        'UPDATE todos SET deleted_at = NOW() WHERE id = ? AND task_id = ? AND deleted_at IS NULL',
        [todoId, taskId]
      );
      return result.affectedRows > 0;
    } finally {
      await conn.end();
    }
  }

  async addEvidence(taskId, evData) {
    const conn = await this._getConnection();
    try {
      const [result] = await conn.execute(
        'INSERT INTO evidences (task_id, type, link, keterangan) VALUES (?, ?, ?, ?)',
        [taskId, evData.type || 'link', evData.link || null, evData.keterangan || '']
      );
      const now = new Date().toISOString();
      return {
        id: result.insertId,
        type: evData.type || 'link',
        link: evData.link || null,
        keterangan: evData.keterangan || '',
        created_at: now,
      };
    } finally {
      await conn.end();
    }
  }

  async updateEvidence(taskId, evId, evData) {
    const conn = await this._getConnection();
    try {
      const sets = [];
      const params = [];
      if (evData.type !== undefined) { sets.push('type = ?'); params.push(evData.type); }
      if (evData.link !== undefined) { sets.push('link = ?'); params.push(evData.link); }
      if (evData.keterangan !== undefined) { sets.push('keterangan = ?'); params.push(evData.keterangan); }

      if (sets.length === 0) return null;

      params.push(evId, taskId);
      const [result] = await conn.execute(
        `UPDATE evidences SET ${sets.join(', ')} WHERE id = ? AND task_id = ? AND deleted_at IS NULL`,
        params
      );
      if (result.affectedRows === 0) return null;

      return {
        id: evId,
        type: evData.type !== undefined ? evData.type : undefined,
        link: evData.link !== undefined ? evData.link : undefined,
        keterangan: evData.keterangan !== undefined ? evData.keterangan : undefined,
      };
    } finally {
      await conn.end();
    }
  }

  async deleteEvidence(taskId, evId) {
    const conn = await this._getConnection();
    try {
      const [result] = await conn.execute(
        'UPDATE evidences SET deleted_at = NOW() WHERE id = ? AND task_id = ? AND deleted_at IS NULL',
        [evId, taskId]
      );
      return result.affectedRows > 0;
    } finally {
      await conn.end();
    }
  }

  async addTaskLog(taskId, action) {
    const conn = await this._getConnection();
    try {
      await conn.execute(
        'INSERT INTO task_changelog (task_id, action) VALUES (?, ?)',
        [taskId, action]
      );
    } finally {
      await conn.end();
    }
  }

  async getTaskLogs(taskId) {
    const conn = await this._getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT task_id AS taskId, action, action_at AS actionAt FROM task_changelog WHERE task_id = ? ORDER BY action_at DESC',
        [taskId]
      );
      return rows.map(r => ({
        taskId: r.taskId,
        action: r.action,
        actionAt: r.actionAt ? r.actionAt.toISOString() : null,
      }));
    } finally {
      await conn.end();
    }
  }

  async addEvidenceLog(taskId, evidenceId, action) {
    const conn = await this._getConnection();
    try {
      await conn.execute(
        'INSERT INTO evidence_changelog (task_id, evidence_id, action) VALUES (?, ?, ?)',
        [taskId, evidenceId, action]
      );
    } finally {
      await conn.end();
    }
  }

  async getEvidenceLogs(taskId) {
    const conn = await this._getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT task_id AS taskId, evidence_id AS evidenceId, action, action_at AS actionAt FROM evidence_changelog WHERE task_id = ? ORDER BY action_at DESC',
        [taskId]
      );
      return rows.map(r => ({
        taskId: r.taskId,
        evidenceId: r.evidenceId,
        action: r.action,
        actionAt: r.actionAt ? r.actionAt.toISOString() : null,
      }));
    } finally {
      await conn.end();
    }
  }

  async addRestoreLog(status, filename) {
    const conn = await this._getConnection();
    try {
      await conn.execute(
        'INSERT INTO restore_log (status, filename) VALUES (?, ?)',
        [status, filename]
      );
    } finally {
      await conn.end();
    }
  }

  async getRestoreLogs() {
    const conn = await this._getConnection();
    try {
      const [rows] = await conn.execute(
        'SELECT status, filename, restore_at AS restoreAt FROM restore_log ORDER BY restore_at DESC'
      );
      return rows.map(r => ({
        status: r.status,
        filename: r.filename,
        restoreAt: r.restoreAt ? r.restoreAt.toISOString() : null,
      }));
    } finally {
      await conn.end();
    }
  }

  async _resolveCategory(slug, conn) {
    if (!slug) return 2; // default: pengembangan
    const [rows] = await conn.execute(
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    );
    return rows.length > 0 ? rows[0].id : 2;
  }

  async getHolidays(conn) {
    const own = !conn;
    const c = conn || await this._getConnection();
    try {
      const [rows] = await c.execute('SELECT id, start_date, end_date, keterangan, created_at, updated_at FROM holidays ORDER BY start_date');
      return rows.map(h => ({
        id: h.id,
        start: h.start_date.toISOString().slice(0, 10),
        end: h.end_date.toISOString().slice(0, 10),
        keterangan: h.keterangan,
        createdAt: h.created_at ? h.created_at.toISOString() : null,
        updatedAt: h.updated_at ? h.updated_at.toISOString() : null,
      }));
    } finally {
      if (own) await c.end();
    }
  }

  async createHoliday(holidayData) {
    const conn = await this._getConnection();
    try {
      const [result] = await conn.execute(
        'INSERT INTO holidays (start_date, end_date, keterangan) VALUES (?, ?, ?)',
        [holidayData.start, holidayData.end || holidayData.start, holidayData.keterangan || '']
      );
      const [rows] = await conn.execute('SELECT id, start_date, end_date, keterangan, created_at, updated_at FROM holidays WHERE id = ?', [result.insertId]);
      const h = rows[0];
      return {
        id: h.id,
        start: h.start_date.toISOString().slice(0, 10),
        end: h.end_date.toISOString().slice(0, 10),
        keterangan: h.keterangan,
        createdAt: h.created_at.toISOString(),
        updatedAt: h.updated_at.toISOString(),
      };
    } finally {
      await conn.end();
    }
  }

  async updateHoliday(id, holidayData) {
    const conn = await this._getConnection();
    try {
      const sets = [];
      const params = [];
      if (holidayData.start !== undefined) { sets.push('start_date = ?'); params.push(holidayData.start); }
      if (holidayData.end !== undefined) { sets.push('end_date = ?'); params.push(holidayData.end); }
      if (holidayData.keterangan !== undefined) { sets.push('keterangan = ?'); params.push(holidayData.keterangan); }
      if (sets.length === 0) return null;
      params.push(id);
      const [result] = await conn.execute(`UPDATE holidays SET ${sets.join(', ')} WHERE id = ?`, params);
      if (result.affectedRows === 0) return null;
      const [rows] = await conn.execute('SELECT id, start_date, end_date, keterangan, created_at, updated_at FROM holidays WHERE id = ?', [id]);
      const h = rows[0];
      return {
        id: h.id,
        start: h.start_date.toISOString().slice(0, 10),
        end: h.end_date.toISOString().slice(0, 10),
        keterangan: h.keterangan,
        createdAt: h.created_at.toISOString(),
        updatedAt: h.updated_at.toISOString(),
      };
    } finally {
      await conn.end();
    }
  }

  async deleteHoliday(id) {
    const conn = await this._getConnection();
    try {
      const [result] = await conn.execute('DELETE FROM holidays WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } finally {
      await conn.end();
    }
  }

  /* ---------- Minutes of Meeting (NONAKTIF) ----------
   * Dukungan MoM untuk MySQL ditangguhkan sementara.
   * API /api/mom diblokir untuk storage MySQL dan migration V10 dinonaktifkan.
   * Method di bawah dipertahankan sebagai referensi untuk aktivasi kembali.
   */
  _mapMomHeader(row, children) {
    const c = children || {};
    return {
      id: row.id,
      momNumber: row.mom_number || '',
      title: row.title || '',
      meetingType: row.meeting_type || 'internal',
      date: momDateStr(row.meeting_date),
      startTime: momTimeStr(row.start_time),
      endTime: momTimeStr(row.end_time),
      location: row.location || '',
      chair: row.chair || '',
      notetaker: row.notetaker || '',
      status: row.status || 'draft',
      attendees: c.attendees || [],
      agenda: c.agenda || [],
      discussions: c.discussions || [],
      decisions: c.decisions || [],
      actionItems: c.actionItems || [],
      nextSteps: row.next_steps || '',
      nextMeetingDate: momDateStr(row.next_meeting_date),
      nextMeetingTime: momTimeStr(row.next_meeting_time),
      nextMeetingLocation: row.next_meeting_location || '',
      preparedBy: {
        name: row.prepared_by_name || '',
        role: row.prepared_by_role || '',
        date: momDateStr(row.prepared_by_date),
        signature: row.prepared_by_signature || '',
      },
      approvedBy: {
        name: row.approved_by_name || '',
        role: row.approved_by_role || '',
        date: momDateStr(row.approved_by_date),
        signature: row.approved_by_signature || '',
      },
      createdAt: momIso(row.created_at),
      updatedAt: momIso(row.updated_at),
    };
  }

  async _loadMomChildrenMap(conn) {
    const map = {};
    const ensure = id => {
      if (!map[id]) map[id] = { attendees: [], agenda: [], discussions: [], decisions: [], actionItems: [] };
      return map[id];
    };

    const [attendees] = await conn.execute(
      'SELECT id, mom_id, name, role, organization, attendance FROM mom_attendees WHERE deleted_at IS NULL ORDER BY mom_id, sort_order, id'
    );
    for (const a of attendees) {
      ensure(a.mom_id).attendees.push({
        id: a.id,
        name: a.name || '',
        role: a.role || '',
        organization: a.organization || '',
        attendance: a.attendance || 'present',
      });
    }

    const [agenda] = await conn.execute(
      'SELECT id, mom_id, topic, presenter, duration FROM mom_agenda WHERE deleted_at IS NULL ORDER BY mom_id, sort_order, id'
    );
    for (const a of agenda) {
      ensure(a.mom_id).agenda.push({
        id: a.id,
        topic: a.topic || '',
        presenter: a.presenter || '',
        duration: a.duration || '',
      });
    }

    const [discussions] = await conn.execute(
      'SELECT id, mom_id, agenda_topic, notes FROM mom_discussions WHERE deleted_at IS NULL ORDER BY mom_id, sort_order, id'
    );
    for (const d of discussions) {
      ensure(d.mom_id).discussions.push({
        id: d.id,
        agendaTopic: d.agenda_topic || '',
        notes: d.notes || '',
      });
    }

    const [decisions] = await conn.execute(
      'SELECT id, mom_id, decision_text FROM mom_decisions WHERE deleted_at IS NULL ORDER BY mom_id, sort_order, id'
    );
    for (const d of decisions) {
      ensure(d.mom_id).decisions.push({
        id: d.id,
        text: d.decision_text || '',
      });
    }

    const [actions] = await conn.execute(
      'SELECT id, mom_id, description, pic, due_date, status FROM mom_action_items WHERE deleted_at IS NULL ORDER BY mom_id, sort_order, id'
    );
    for (const a of actions) {
      ensure(a.mom_id).actionItems.push({
        id: a.id,
        description: a.description || '',
        pic: a.pic || '',
        dueDate: momDateStr(a.due_date),
        status: a.status || 'open',
      });
    }

    return map;
  }

  async getMomMeetings() {
    const conn = await this._getConnection();
    try {
      const [headers] = await conn.execute(
        `SELECT ${MOM_HEADER_COLUMNS} FROM mom_meetings WHERE deleted_at IS NULL ORDER BY meeting_date DESC, id DESC`
      );
      if (headers.length === 0) return [];
      const map = await this._loadMomChildrenMap(conn);
      return headers.map(h => this._mapMomHeader(h, map[h.id]));
    } finally {
      await conn.end();
    }
  }

  async getMomMeetingById(id) {
    const conn = await this._getConnection();
    try {
      const [headers] = await conn.execute(
        `SELECT ${MOM_HEADER_COLUMNS} FROM mom_meetings WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );
      if (headers.length === 0) return null;

      const [attendees] = await conn.execute(
        'SELECT id, name, role, organization, attendance FROM mom_attendees WHERE mom_id = ? AND deleted_at IS NULL ORDER BY sort_order, id',
        [id]
      );
      const [agenda] = await conn.execute(
        'SELECT id, topic, presenter, duration FROM mom_agenda WHERE mom_id = ? AND deleted_at IS NULL ORDER BY sort_order, id',
        [id]
      );
      const [discussions] = await conn.execute(
        'SELECT id, agenda_topic, notes FROM mom_discussions WHERE mom_id = ? AND deleted_at IS NULL ORDER BY sort_order, id',
        [id]
      );
      const [decisions] = await conn.execute(
        'SELECT id, decision_text FROM mom_decisions WHERE mom_id = ? AND deleted_at IS NULL ORDER BY sort_order, id',
        [id]
      );
      const [actions] = await conn.execute(
        'SELECT id, description, pic, due_date, status FROM mom_action_items WHERE mom_id = ? AND deleted_at IS NULL ORDER BY sort_order, id',
        [id]
      );

      return this._mapMomHeader(headers[0], {
        attendees: attendees.map(a => ({
          id: a.id,
          name: a.name || '',
          role: a.role || '',
          organization: a.organization || '',
          attendance: a.attendance || 'present',
        })),
        agenda: agenda.map(a => ({
          id: a.id,
          topic: a.topic || '',
          presenter: a.presenter || '',
          duration: a.duration || '',
        })),
        discussions: discussions.map(d => ({
          id: d.id,
          agendaTopic: d.agenda_topic || '',
          notes: d.notes || '',
        })),
        decisions: decisions.map(d => ({
          id: d.id,
          text: d.decision_text || '',
        })),
        actionItems: actions.map(a => ({
          id: a.id,
          description: a.description || '',
          pic: a.pic || '',
          dueDate: momDateStr(a.due_date),
          status: a.status || 'open',
        })),
      });
    } finally {
      await conn.end();
    }
  }

  async _nextMomNumber(conn, year) {
    const prefix = `MoM/${year}/`;
    const [rows] = await conn.execute(
      'SELECT mom_number FROM mom_meetings WHERE mom_number LIKE ?',
      [prefix + '%']
    );
    let max = 0;
    for (const row of rows) {
      const n = parseInt(String(row.mom_number).slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return prefix + String(max + 1).padStart(3, '0');
  }

  async _insertMomChildren(conn, momId, data) {
    const attendees = Array.isArray(data.attendees) ? data.attendees : [];
    for (let i = 0; i < attendees.length; i++) {
      const a = attendees[i] || {};
      await conn.execute(
        'INSERT INTO mom_attendees (mom_id, name, role, organization, attendance, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [momId, momStr(a.name), momStr(a.role), momStr(a.organization), momStr(a.attendance) || 'present', i]
      );
    }

    const agenda = Array.isArray(data.agenda) ? data.agenda : [];
    for (let i = 0; i < agenda.length; i++) {
      const a = agenda[i] || {};
      await conn.execute(
        'INSERT INTO mom_agenda (mom_id, topic, presenter, duration, sort_order) VALUES (?, ?, ?, ?, ?)',
        [momId, momStr(a.topic), momStr(a.presenter), momStr(a.duration), i]
      );
    }

    const discussions = Array.isArray(data.discussions) ? data.discussions : [];
    for (let i = 0; i < discussions.length; i++) {
      const d = discussions[i] || {};
      await conn.execute(
        'INSERT INTO mom_discussions (mom_id, agenda_topic, notes, sort_order) VALUES (?, ?, ?, ?)',
        [momId, momStr(d.agendaTopic), momStr(d.notes), i]
      );
    }

    const decisions = Array.isArray(data.decisions) ? data.decisions : [];
    for (let i = 0; i < decisions.length; i++) {
      const d = decisions[i] || {};
      await conn.execute(
        'INSERT INTO mom_decisions (mom_id, decision_text, sort_order) VALUES (?, ?, ?)',
        [momId, momStr(d.text), i]
      );
    }

    const actions = Array.isArray(data.actionItems) ? data.actionItems : [];
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i] || {};
      await conn.execute(
        'INSERT INTO mom_action_items (mom_id, description, pic, due_date, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [momId, momStr(a.description), momStr(a.pic), a.dueDate || null, momStr(a.status) || 'open', i]
      );
    }
  }

  async createMomMeeting(data) {
    const conn = await this._getConnection();
    let newId = null;
    try {
      await conn.beginTransaction();
      const year = momDateStr(data.date).slice(0, 4) || String(new Date().getFullYear());
      const momNumber = data.momNumber || await this._nextMomNumber(conn, year);
      const prepared = data.preparedBy || {};
      const approved = data.approvedBy || {};

      const [result] = await conn.execute(
        `INSERT INTO mom_meetings
          (mom_number, title, meeting_type, meeting_date, start_time, end_time, location, chair, notetaker, status,
           next_steps, next_meeting_date, next_meeting_time, next_meeting_location,
           prepared_by_name, prepared_by_role, prepared_by_date, prepared_by_signature,
           approved_by_name, approved_by_role, approved_by_date, approved_by_signature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          momNumber,
          momStr(data.title).trim(),
          momStr(data.meetingType) || 'internal',
          data.date,
          data.startTime || null,
          data.endTime || null,
          momStr(data.location),
          momStr(data.chair),
          momStr(data.notetaker),
          data.status === 'final' ? 'final' : 'draft',
          momStr(data.nextSteps),
          data.nextMeetingDate || null,
          data.nextMeetingTime || null,
          momStr(data.nextMeetingLocation),
          momStr(prepared.name),
          momStr(prepared.role),
          prepared.date || null,
          momStr(prepared.signature) || null,
          momStr(approved.name),
          momStr(approved.role),
          approved.date || null,
          momStr(approved.signature) || null,
        ]
      );
      newId = result.insertId;
      await this._insertMomChildren(conn, newId, data);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      await conn.end();
    }
    return this.getMomMeetingById(newId);
  }

  async updateMomMeeting(id, data) {
    const conn = await this._getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.execute(
        'SELECT id FROM mom_meetings WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      if (existing.length === 0) {
        await conn.rollback();
        return null;
      }

      const sets = [];
      const params = [];
      const scalarMap = {
        title: 'title',
        meetingType: 'meeting_type',
        date: 'meeting_date',
        startTime: 'start_time',
        endTime: 'end_time',
        location: 'location',
        chair: 'chair',
        notetaker: 'notetaker',
        status: 'status',
        nextSteps: 'next_steps',
        nextMeetingDate: 'next_meeting_date',
        nextMeetingTime: 'next_meeting_time',
        nextMeetingLocation: 'next_meeting_location',
      };
      for (const [key, col] of Object.entries(scalarMap)) {
        if (data[key] !== undefined) {
          let value = data[key];
          if (key === 'title') value = momStr(value).trim();
          if (key === 'status') value = value === 'final' ? 'final' : 'draft';
          if (['startTime', 'endTime', 'nextMeetingDate', 'nextMeetingTime'].includes(key)) value = value || null;
          sets.push(`${col} = ?`);
          params.push(value);
        }
      }
      if (data.momNumber !== undefined) {
        sets.push('mom_number = ?');
        params.push(momStr(data.momNumber));
      }

      const prepared = data.preparedBy;
      if (prepared) {
        if (prepared.name !== undefined) { sets.push('prepared_by_name = ?'); params.push(momStr(prepared.name)); }
        if (prepared.role !== undefined) { sets.push('prepared_by_role = ?'); params.push(momStr(prepared.role)); }
        if (prepared.date !== undefined) { sets.push('prepared_by_date = ?'); params.push(prepared.date || null); }
        if (prepared.signature !== undefined) { sets.push('prepared_by_signature = ?'); params.push(prepared.signature || null); }
      }
      const approved = data.approvedBy;
      if (approved) {
        if (approved.name !== undefined) { sets.push('approved_by_name = ?'); params.push(momStr(approved.name)); }
        if (approved.role !== undefined) { sets.push('approved_by_role = ?'); params.push(momStr(approved.role)); }
        if (approved.date !== undefined) { sets.push('approved_by_date = ?'); params.push(approved.date || null); }
        if (approved.signature !== undefined) { sets.push('approved_by_signature = ?'); params.push(approved.signature || null); }
      }

      sets.push('updated_at = NOW()');
      params.push(id);
      await conn.execute(
        `UPDATE mom_meetings SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
        params
      );

      if (data.attendees !== undefined) {
        await conn.execute('DELETE FROM mom_attendees WHERE mom_id = ?', [id]);
        const list = Array.isArray(data.attendees) ? data.attendees : [];
        for (let i = 0; i < list.length; i++) {
          const a = list[i] || {};
          await conn.execute(
            'INSERT INTO mom_attendees (mom_id, name, role, organization, attendance, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [id, momStr(a.name), momStr(a.role), momStr(a.organization), momStr(a.attendance) || 'present', i]
          );
        }
      }
      if (data.agenda !== undefined) {
        await conn.execute('DELETE FROM mom_agenda WHERE mom_id = ?', [id]);
        const list = Array.isArray(data.agenda) ? data.agenda : [];
        for (let i = 0; i < list.length; i++) {
          const a = list[i] || {};
          await conn.execute(
            'INSERT INTO mom_agenda (mom_id, topic, presenter, duration, sort_order) VALUES (?, ?, ?, ?, ?)',
            [id, momStr(a.topic), momStr(a.presenter), momStr(a.duration), i]
          );
        }
      }
      if (data.discussions !== undefined) {
        await conn.execute('DELETE FROM mom_discussions WHERE mom_id = ?', [id]);
        const list = Array.isArray(data.discussions) ? data.discussions : [];
        for (let i = 0; i < list.length; i++) {
          const d = list[i] || {};
          await conn.execute(
            'INSERT INTO mom_discussions (mom_id, agenda_topic, notes, sort_order) VALUES (?, ?, ?, ?)',
            [id, momStr(d.agendaTopic), momStr(d.notes), i]
          );
        }
      }
      if (data.decisions !== undefined) {
        await conn.execute('DELETE FROM mom_decisions WHERE mom_id = ?', [id]);
        const list = Array.isArray(data.decisions) ? data.decisions : [];
        for (let i = 0; i < list.length; i++) {
          const d = list[i] || {};
          await conn.execute(
            'INSERT INTO mom_decisions (mom_id, decision_text, sort_order) VALUES (?, ?, ?)',
            [id, momStr(d.text), i]
          );
        }
      }
      if (data.actionItems !== undefined) {
        await conn.execute('DELETE FROM mom_action_items WHERE mom_id = ?', [id]);
        const list = Array.isArray(data.actionItems) ? data.actionItems : [];
        for (let i = 0; i < list.length; i++) {
          const a = list[i] || {};
          await conn.execute(
            'INSERT INTO mom_action_items (mom_id, description, pic, due_date, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [id, momStr(a.description), momStr(a.pic), a.dueDate || null, momStr(a.status) || 'open', i]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      await conn.end();
    }
    return this.getMomMeetingById(id);
  }

  async deleteMomMeeting(id) {
    const conn = await this._getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        'UPDATE mom_meetings SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      if (result.affectedRows > 0) {
        for (const table of ['mom_attendees', 'mom_agenda', 'mom_discussions', 'mom_decisions', 'mom_action_items']) {
          await conn.execute(
            `UPDATE ${table} SET deleted_at = NOW() WHERE mom_id = ? AND deleted_at IS NULL`,
            [id]
          );
        }
      }
      await conn.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      await conn.end();
    }
  }

  async getMetadata() {
    const conn = await this._getConnection();
    try {
      const [metaRows] = await conn.execute("SELECT `key`, `value` FROM app_metadata");
      const metadata = { version: 1, lastSynced: null, updatedAt: null, title: 'Timeframe as a System Analyst' };
      for (const row of metaRows) {
        if (row.key === 'lastSynced') metadata.lastSynced = row.value;
        if (row.key === 'updatedAt') metadata.updatedAt = row.value;
        if (row.key === 'title') metadata.title = row.value;
      }
      return metadata;
    } finally {
      await conn.end();
    }
  }

  async updateMetadata(updates) {
    const conn = await this._getConnection();
    try {
      if (updates.title !== undefined) {
        await conn.execute(
          "INSERT INTO app_metadata (`key`, `value`) VALUES ('title', ?) ON DUPLICATE KEY UPDATE `value` = ?",
          [updates.title, updates.title]
        );
      }
      return this.getMetadata();
    } finally {
      await conn.end();
    }
  }
}

module.exports = MysqlStorage;
