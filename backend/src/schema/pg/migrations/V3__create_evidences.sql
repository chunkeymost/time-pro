CREATE TABLE IF NOT EXISTS evidences (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  link VARCHAR(500) NOT NULL,
  keterangan TEXT,
  deleted_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidences_task ON evidences(task_id);
CREATE INDEX IF NOT EXISTS idx_evidences_deleted ON evidences(deleted_at);
