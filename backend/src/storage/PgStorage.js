const { Pool } = require('pg');

class PgStorage {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }

  _formatDate(d) {
    if (!d) return null;
    if (typeof d === 'string') return d;
    return d.toISOString().slice(0, 10);
  }

  _toISO(d) {
    if (!d) return null;
    if (typeof d === 'string') return d;
    return d instanceof Date ? d.toISOString() : null;
  }

  async getAll() {
    const [tasks, todos, evidences, categories, metaRows, maxIds] = await Promise.all([
      this.pool.query(
        'SELECT id, name, start_date, end_date, category_id, assignee, progress, created_at, updated_at FROM tasks WHERE deleted_at IS NULL ORDER BY id'
      ),
      this.pool.query(
        'SELECT id, task_id, text, done, due_date FROM todos WHERE deleted_at IS NULL ORDER BY id'
      ),
      this.pool.query(
        'SELECT id, task_id, link, keterangan, created_at FROM evidences WHERE deleted_at IS NULL ORDER BY id'
      ),
      this.pool.query('SELECT id, slug FROM categories'),
      this.pool.query("SELECT key, value FROM app_metadata"),
      this.pool.query('SELECT MAX(id) AS "maxId" FROM tasks'),
    ]);
    const seqTodoRes = await this.pool.query("SELECT last_value + 1 AS next_id FROM todos_id_seq");
    const seqEvRes = await this.pool.query("SELECT last_value + 1 AS next_id FROM evidences_id_seq");

    const todoMap = {};
    for (const t of todos.rows) {
      if (!todoMap[t.task_id]) todoMap[t.task_id] = [];
      todoMap[t.task_id].push({
        id: t.id,
        text: t.text,
        done: t.done,
        due: this._formatDate(t.due_date),
      });
    }

    const evidenceMap = {};
    for (const e of evidences.rows) {
      if (!evidenceMap[e.task_id]) evidenceMap[e.task_id] = [];
      evidenceMap[e.task_id].push({
        id: e.id,
        link: e.link,
        keterangan: e.keterangan,
        created_at: this._toISO(e.created_at),
      });
    }

    const catMap = {};
    for (const c of categories.rows) catMap[c.id] = c.slug;

    const metadata = { version: 1, lastSynced: null, updatedAt: null, title: 'Timeframe as a System Analyst' };
    for (const row of metaRows.rows) {
      if (row.key === 'lastSynced') metadata.lastSynced = row.value;
      if (row.key === 'updatedAt') metadata.updatedAt = row.value;
      if (row.key === 'title') metadata.title = row.value;
    }

    return {
      tasks: tasks.rows.map(t => ({
        id: t.id,
        name: t.name,
        start: this._formatDate(t.start_date),
        end: this._formatDate(t.end_date),
        cat: catMap[t.category_id] || '',
        category_id: t.category_id,
        assignee: t.assignee,
        progress: t.progress,
        todos: todoMap[t.id] || [],
        evidences: evidenceMap[t.id] || [],
        createdAt: this._toISO(t.created_at),
        updatedAt: this._toISO(t.updated_at),
      })),
      nextId: (maxIds.rows[0].maxId || 0) + 1,
      nextTodoId: (seqTodoRes.rows[0].next_id || 1),
      nextEvidenceId: (seqEvRes.rows[0].next_id || 1),
      metadata,
    };
  }

  async getById(id) {
    const taskRes = await this.pool.query(
      'SELECT id, name, start_date, end_date, category_id, assignee, progress, created_at, updated_at FROM tasks WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    if (taskRes.rows.length === 0) return null;
    const t = taskRes.rows[0];

    const catRes = await this.pool.query('SELECT slug FROM categories WHERE id = $1', [t.category_id]);
    const catSlug = catRes.rows.length > 0 ? catRes.rows[0].slug : '';

    const todoRes = await this.pool.query(
      'SELECT id, text, done, due_date FROM todos WHERE task_id = $1 AND deleted_at IS NULL',
      [id]
    );

    const evRes = await this.pool.query(
      'SELECT id, link, keterangan, created_at FROM evidences WHERE task_id = $1 AND deleted_at IS NULL',
      [id]
    );

    return {
      id: t.id,
      name: t.name,
      start: this._formatDate(t.start_date),
      end: this._formatDate(t.end_date),
      cat: catSlug,
      category_id: t.category_id,
      assignee: t.assignee,
      progress: t.progress,
      todos: todoRes.rows.map(td => ({
        id: td.id,
        text: td.text,
        done: td.done,
        due: this._formatDate(td.due_date),
      })),
      evidences: evRes.rows.map(e => ({
        id: e.id,
        link: e.link,
        keterangan: e.keterangan,
        created_at: this._toISO(e.created_at),
      })),
      createdAt: this._toISO(t.created_at),
      updatedAt: this._toISO(t.updated_at),
    };
  }

  async create(taskData) {
    const categoryId = taskData.category_id || await this._resolveCategory(taskData.cat);
    const result = await this.pool.query(
      `INSERT INTO tasks (name, start_date, end_date, category_id, assignee, progress)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        taskData.name || '',
        taskData.start,
        taskData.end,
        categoryId,
        taskData.assignee || '',
        typeof taskData.progress === 'number' ? taskData.progress : 0,
      ]
    );
    return this.getById(result.rows[0].id);
  }

  async update(id, taskData) {
    const sets = [];
    const params = [];
    let idx = 1;

    if (taskData.name !== undefined) { sets.push(`name = $${idx++}`); params.push(taskData.name); }
    if (taskData.start !== undefined) { sets.push(`start_date = $${idx++}`); params.push(taskData.start); }
    if (taskData.end !== undefined) { sets.push(`end_date = $${idx++}`); params.push(taskData.end); }
    if (taskData.cat !== undefined) {
      const catId = await this._resolveCategory(taskData.cat);
      sets.push(`category_id = $${idx++}`);
      params.push(catId);
    }
    if (taskData.category_id !== undefined) { sets.push(`category_id = $${idx++}`); params.push(taskData.category_id); }
    if (taskData.assignee !== undefined) { sets.push(`assignee = $${idx++}`); params.push(taskData.assignee); }
    if (taskData.progress !== undefined) { sets.push(`progress = $${idx++}`); params.push(taskData.progress); }

    if (sets.length === 0) return this.getById(id);

    params.push(id);
    await this.pool.query(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND deleted_at IS NULL`,
      params
    );
    return this.getById(id);
  }

  async delete(id) {
    const result = await this.pool.query(
      'UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rowCount > 0;
  }

  async addTodo(taskId, todoData) {
    const result = await this.pool.query(
      `INSERT INTO todos (task_id, text, done, due_date)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [taskId, todoData.text || '', todoData.done || false, todoData.due || null]
    );
    const todoId = result.rows[0].id;
    return {
      id: todoId,
      text: todoData.text || '',
      done: todoData.done || false,
      due: todoData.due || null,
    };
  }

  async updateTodo(taskId, todoId, todoData) {
    const sets = [];
    const params = [];
    let idx = 1;

    if (todoData.text !== undefined) { sets.push(`text = $${idx++}`); params.push(todoData.text); }
    if (todoData.done !== undefined) { sets.push(`done = $${idx++}`); params.push(todoData.done); }
    if (todoData.due !== undefined) { sets.push(`due_date = $${idx++}`); params.push(todoData.due || null); }

    if (sets.length === 0) return null;

    params.push(todoId, taskId);
    const result = await this.pool.query(
      `UPDATE todos SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND task_id = $${idx} AND deleted_at IS NULL`,
      params
    );
    if (result.rowCount === 0) return null;

    return {
      id: todoId,
      text: todoData.text !== undefined ? todoData.text : undefined,
      done: todoData.done !== undefined ? todoData.done : undefined,
      due: todoData.due !== undefined ? todoData.due : undefined,
    };
  }

  async deleteTodo(taskId, todoId) {
    const result = await this.pool.query(
      'UPDATE todos SET deleted_at = NOW() WHERE id = $1 AND task_id = $2 AND deleted_at IS NULL',
      [todoId, taskId]
    );
    return result.rowCount > 0;
  }

  async addEvidence(taskId, evData) {
    const result = await this.pool.query(
      'INSERT INTO evidences (task_id, link, keterangan) VALUES ($1, $2, $3) RETURNING id',
      [taskId, evData.link || '', evData.keterangan || '']
    );
    const now = new Date().toISOString();
    return {
      id: result.rows[0].id,
      link: evData.link || '',
      keterangan: evData.keterangan || '',
      created_at: now,
    };
  }

  async updateEvidence(taskId, evId, evData) {
    const sets = [];
    const params = [];
    let idx = 1;

    if (evData.link !== undefined) { sets.push(`link = $${idx++}`); params.push(evData.link); }
    if (evData.keterangan !== undefined) { sets.push(`keterangan = $${idx++}`); params.push(evData.keterangan); }

    if (sets.length === 0) return null;

    params.push(evId, taskId);
    const result = await this.pool.query(
      `UPDATE evidences SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND task_id = $${idx} AND deleted_at IS NULL`,
      params
    );
    if (result.rowCount === 0) return null;

    return {
      id: evId,
      link: evData.link !== undefined ? evData.link : undefined,
      keterangan: evData.keterangan !== undefined ? evData.keterangan : undefined,
    };
  }

  async deleteEvidence(taskId, evId) {
    const result = await this.pool.query(
      'UPDATE evidences SET deleted_at = NOW() WHERE id = $1 AND task_id = $2 AND deleted_at IS NULL',
      [evId, taskId]
    );
    return result.rowCount > 0;
  }

  async _resolveCategory(slug) {
    if (!slug) return 2;
    const result = await this.pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
    return result.rows.length > 0 ? result.rows[0].id : 2;
  }

  async getMetadata() {
    const result = await this.pool.query("SELECT key, value FROM app_metadata");
    const metadata = { version: 1, lastSynced: null, updatedAt: null, title: 'Timeframe as a System Analyst' };
    for (const row of result.rows) {
      if (row.key === 'lastSynced') metadata.lastSynced = row.value;
      if (row.key === 'updatedAt') metadata.updatedAt = row.value;
      if (row.key === 'title') metadata.title = row.value;
    }
    return metadata;
  }

  async updateMetadata(updates) {
    if (updates.title !== undefined) {
      await this.pool.query(
        `INSERT INTO app_metadata (key, value) VALUES ('title', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [updates.title]
      );
    }
    return this.getMetadata();
  }
}

module.exports = PgStorage;
