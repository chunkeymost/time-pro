const mysql = require('mysql2/promise');

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

  async _resolveCategory(slug, conn) {
    if (!slug) return 2; // default: pengembangan
    const [rows] = await conn.execute(
      'SELECT id FROM categories WHERE slug = ?',
      [slug]
    );
    return rows.length > 0 ? rows[0].id : 2;
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
