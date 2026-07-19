const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const pgConfig = require('./config-pg');

const FORCE = process.argv.includes('--force');

async function seedFromJson() {
  const jsonPath = config.dataPath;
  if (!fs.existsSync(jsonPath)) {
    console.error(`File tidak ditemukan: ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('Gagal parsing tasks.json — pastikan format JSON valid.');
    process.exit(1);
  }

  const { tasks, nextId, nextTodoId, nextEvidenceId } = data;

  if (!tasks || tasks.length === 0) {
    console.log('Tidak ada task di tasks.json untuk di-seed.');
    process.exit(0);
  }

  const pool = new Pool({ connectionString: pgConfig.connectionString });

  try {
    const guard = await pool.query("SELECT value FROM app_metadata WHERE key = 'json_seeded_at'");
    if (guard.rows.length > 0 && !FORCE) {
      console.log('Data sudah pernah di-seed ke PostgreSQL. Gunakan --force untuk re-import.');
      console.log(`  Terakhir: ${guard.rows[0].value}`);
      process.exit(0);
    }

    if (FORCE) {
      console.log('FORCE mode: menghapus data lama...');
      await pool.query('DELETE FROM evidences');
      await pool.query('DELETE FROM todos');
      await pool.query('DELETE FROM tasks');
    }

    const catRes = await pool.query('SELECT id, slug FROM categories');
    const catMap = {};
    for (const c of catRes.rows) catMap[c.slug] = c.id;

    let imported = 0;
    for (const task of tasks) {
      let catId = task.category_id || catMap[task.cat];
      if (!catId && task.cat) {
        const newCat = await pool.query(
          `INSERT INTO categories (slug, name) VALUES ($1, $1)
           ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
           RETURNING id`,
          [task.cat]
        );
        catId = newCat.rows[0].id;
        catMap[task.cat] = catId;
        console.log(`  [AUTO] Kategori baru "${task.cat}" dibuat dengan id=${catId}`);
      }
      catId = catId || 2;

      const existing = await pool.query('SELECT id FROM tasks WHERE id = $1', [task.id]);
      if (existing.rows.length > 0 && !FORCE) {
        await pool.query(
          `UPDATE tasks SET name=$1, start_date=$2, end_date=$3, category_id=$4, assignee=$5, progress=$6
           WHERE id=$7`,
          [task.name, task.start, task.end, catId, task.assignee || '', task.progress || 0, task.id]
        );
        await pool.query('DELETE FROM todos WHERE task_id = $1', [task.id]);
        await pool.query('DELETE FROM evidences WHERE task_id = $1', [task.id]);
      } else if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO tasks (id, name, start_date, end_date, category_id, assignee, progress)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
          [task.id, task.name, task.start, task.end, catId, task.assignee || '', task.progress || 0]
        );
      }

      if (task.todos && task.todos.length > 0) {
        for (const todo of task.todos) {
          await pool.query(
            `INSERT INTO todos (id, task_id, text, done, due_date)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [todo.id, task.id, todo.text, todo.done || false, todo.due || null]
          );
        }
      }

      if (task.evidences && task.evidences.length > 0) {
        for (const ev of task.evidences) {
          await pool.query(
            `INSERT INTO evidences (id, task_id, link, keterangan, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [ev.id, task.id, ev.link, ev.keterangan || '', ev.created_at || new Date().toISOString()]
          );
        }
      }

      imported++;
    }

    await pool.query(
      `INSERT INTO app_metadata (key, value) VALUES ('json_seeded_at', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [new Date().toISOString()]
    );

    await pool.query("SELECT setval(pg_get_serial_sequence('tasks', 'id'), (SELECT COALESCE(MAX(id), 0) FROM tasks))");
    await pool.query("SELECT setval(pg_get_serial_sequence('todos', 'id'), (SELECT COALESCE(MAX(id), 0) FROM todos))");
    await pool.query("SELECT setval(pg_get_serial_sequence('evidences', 'id'), (SELECT COALESCE(MAX(id), 0) FROM evidences))");

    console.log(`\n✅ ${imported} task(s) berhasil di-import ke PostgreSQL.`);
  } finally {
    await pool.end();
  }
}

seedFromJson().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
