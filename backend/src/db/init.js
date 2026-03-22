const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function initDB(dbPath) {
  const resolvedPath = dbPath || path.join(__dirname, '..', '..', 'data', 'pwb.db');
  // Ensure data directory exists
  const fs = require('fs');
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('parent', 'child')),
      wechat_open_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medication_plans (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      dosage TEXT NOT NULL,
      schedule_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES family_members(id)
    );

    CREATE TABLE IF NOT EXISTS med_confirmations (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      confirmed_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('taken', 'skipped')),
      FOREIGN KEY (plan_id) REFERENCES medication_plans(id),
      FOREIGN KEY (parent_id) REFERENCES family_members(id)
    );

    CREATE TABLE IF NOT EXISTS werun_data (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      step_count INTEGER NOT NULL,
      data_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES family_members(id)
    );

    CREATE TABLE IF NOT EXISTS daily_summaries (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      summary_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('green', 'yellow')),
      detail_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES family_members(id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_med_plans_parent ON medication_plans(parent_id);
    CREATE INDEX IF NOT EXISTS idx_med_confirm_plan ON med_confirmations(plan_id);
    CREATE INDEX IF NOT EXISTS idx_med_confirm_parent ON med_confirmations(parent_id);
    CREATE INDEX IF NOT EXISTS idx_med_confirm_time ON med_confirmations(scheduled_time);
    CREATE INDEX IF NOT EXISTS idx_werun_parent ON werun_data(parent_id);
    CREATE INDEX IF NOT EXISTS idx_werun_date ON werun_data(data_date);
    CREATE INDEX IF NOT EXISTS idx_werun_parent_date ON werun_data(parent_id, data_date);
    CREATE INDEX IF NOT EXISTS idx_daily_summary_parent ON daily_summaries(parent_id);
    CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summaries(summary_date);
  `);

  return db;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

module.exports = { initDB, getDB };
