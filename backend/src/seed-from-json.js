const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

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

  const { tasks, nextId, nextTodoId } = data;

  if (!tasks || tasks.length === 0) {
    console.log('Tidak ada task di tasks.json untuk di-seed.');
    process.exit(0);
  }

  const conn = await mysql.createConnection(config.mysql);

  try {
    const [catRows] = await conn.execute('SELECT COUNT(*) AS cnt FROM categories');
    if (catRows[0].cnt === 0) {
      console.error('Tabel categories kosong. Jalankan npm run db:migrate terlebih dahulu.');
      await conn.end();
      process.exit(1);
    }

    const [seeded] = await conn.execute(
      "SELECT `value` FROM app_metadata WHERE `key` = 'json_seeded_at'"
    );

    if (seeded.length > 0) {
      if (!FORCE) {
        console.log(`Data sudah pernah di-seed pada ${seeded[0].value}.`);

        // Sync evidence jika tabel evidences baru ditambahkan via V3 migration
        let syncCount = 0;
        for (const task of tasks) {
          if (!task.evidences || task.evidences.length === 0) continue;
          const [exists] = await conn.execute('SELECT id FROM tasks WHERE id = ?', [task.id]);
          if (exists.length === 0) continue;
          for (const ev of task.evidences) {
            const evCreatedAt = ev.created_at
              ? new Date(ev.created_at).toISOString().slice(0, 19).replace('T', ' ')
              : new Date().toISOString().slice(0, 19).replace('T', ' ');
            await conn.execute(
              `INSERT IGNORE INTO evidences (id, task_id, link, keterangan, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, NOW())`,
              [ev.id, task.id, ev.link || '', ev.keterangan || '', evCreatedAt]
            );
            syncCount++;
          }
        }
        console.log(`Sync ${syncCount} evidences dari data JSON.`);

        console.log('Gunakan --force untuk mengulang (hapus data lama + re-import).');
        await conn.end();
        process.exit(0);
      }
      console.log('Force mode: menghapus data existing...');
      await conn.execute('DELETE FROM evidences');
      await conn.execute('DELETE FROM todos');
      await conn.execute('DELETE FROM tasks');
      await conn.execute("DELETE FROM app_metadata WHERE `key` = 'json_seeded_at'");
    }

    const [cats] = await conn.execute('SELECT id, slug FROM categories');
    const catMap = {};
    for (const c of cats) catMap[c.slug] = c.id;

    await conn.beginTransaction();

    let taskCount = 0;
    let todoCount = 0;
    let evidenceCount = 0;

    for (const task of tasks) {
      let catId = catMap[task.cat];
      if (!catId) {
        const catName = task.cat.charAt(0).toUpperCase() + task.cat.slice(1);
        await conn.execute(
          'INSERT IGNORE INTO categories (slug, name) VALUES (?, ?)',
          [task.cat, catName]
        );
        const [newCat] = await conn.execute('SELECT id FROM categories WHERE slug = ?', [task.cat]);
        if (newCat.length === 0) {
          console.warn(`  [SKIP] Task "${task.name}" — kategori "${task.cat}" gagal dibuat.`);
          continue;
        }
        catMap[task.cat] = newCat[0].id;
        catId = newCat[0].id;
        console.log(`  [AUTO] Kategori "${task.cat}" dibuat otomatis.`);
      }

      const createdAt = task.createdAt
        ? new Date(task.createdAt).toISOString().slice(0, 19).replace('T', ' ')
        : new Date().toISOString().slice(0, 19).replace('T', ' ');
      const updatedAt = task.updatedAt
        ? new Date(task.updatedAt).toISOString().slice(0, 19).replace('T', ' ')
        : createdAt;

      await conn.execute(
        `INSERT INTO tasks (id, name, start_date, end_date, category_id, assignee, progress, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           start_date = VALUES(start_date),
           end_date = VALUES(end_date),
           category_id = VALUES(category_id),
           assignee = VALUES(assignee),
           progress = VALUES(progress),
           updated_at = VALUES(updated_at)`,
        [
          task.id,
          task.name,
          task.start,
          task.end,
          catId,
          task.assignee || '',
          task.progress || 0,
          createdAt,
          updatedAt,
        ]
      );
      taskCount++;

      if (task.todos && task.todos.length > 0) {
        for (const todo of task.todos) {
          await conn.execute(
            `INSERT INTO todos (id, task_id, text, done, due_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
               text = VALUES(text),
               done = VALUES(done),
               due_date = VALUES(due_date),
               updated_at = NOW()`,
            [
              todo.id,
              task.id,
              todo.text,
              todo.done ? 1 : 0,
              todo.due || null,
            ]
          );
          todoCount++;
        }
      }

      if (task.evidences && task.evidences.length > 0) {
        for (const ev of task.evidences) {
          const evCreatedAt = ev.created_at
            ? new Date(ev.created_at).toISOString().slice(0, 19).replace('T', ' ')
            : new Date().toISOString().slice(0, 19).replace('T', ' ');

          await conn.execute(
            `INSERT INTO evidences (id, task_id, link, keterangan, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               link = VALUES(link),
               keterangan = VALUES(keterangan),
               updated_at = NOW()`,
            [
              ev.id,
              task.id,
              ev.link || '',
              ev.keterangan || '',
              evCreatedAt,
            ]
          );
          evidenceCount++;
        }
      }
    }

    await conn.execute(
      "INSERT INTO app_metadata (`key`, `value`) VALUES ('json_seeded_at', NOW())"
    );

    await conn.commit();

    console.log(`Import selesai: ${taskCount} tasks, ${todoCount} todos, ${evidenceCount} evidences`);
  } catch (err) {
    await conn.rollback();
    console.error('Gagal import data:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seedFromJson();
