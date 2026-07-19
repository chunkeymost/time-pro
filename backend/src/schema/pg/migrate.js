const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../../config-pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function migrate() {
  const pool = new Pool({ connectionString: config.connectionString });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
    const applied = new Set(result.rows.map(r => r.version));

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

      try {
        await pool.query('BEGIN');
        for (const statement of sql.split(';').filter(s => s.trim())) {
          await pool.query(statement.trim());
        }
        await pool.query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [version, file]
        );
        await pool.query('COMMIT');
        console.log(`  [ OK ] V${version} — ${file}`);
        pending++;
      } catch (err) {
        await pool.query('ROLLBACK');
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
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
