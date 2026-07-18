const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  const connection = await mysql.createConnection(config.mysql);

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const [rows] = await connection.execute(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const applied = new Set(rows.map(r => r.version));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let pending = 0;
    for (const file of files) {
      const match = file.match(/^V(\d+)__/);
      if (!match) continue;
      const version = parseInt(match[1], 10);

      if (applied.has(version)) {
        console.log(`  [SKIP] V${version} — ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

      await connection.beginTransaction();
      try {
        for (const statement of sql.split(';').filter(s => s.trim())) {
          await connection.execute(statement.trim());
        }
        await connection.execute(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [version, file]
        );
        await connection.commit();
        console.log(`  [ OK ] V${version} — ${file}`);
        pending++;
      } catch (err) {
        await connection.rollback();
        console.error(`  [FAIL] V${version} — ${file}: ${err.message}`);
        throw err;
      }
    }

    if (pending === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`\n${pending} migration(s) applied successfully.`);
    }
  } finally {
    await connection.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
