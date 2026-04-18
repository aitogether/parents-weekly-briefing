/**
 * 数据迁移脚本：data.json → SQLite
 *
 * 功能：
 * - 读取现有的 data.json 文件
 * - 将数据迁移到 SQLite 数据库
 * - 保留原文件备份（data.json.bak）
 * - 支持重复执行（幂等性）
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const { encryptFields } = require('../src/utils/encryption');

// 数据库文件路径（与 encryption-enabled.js 一致）
const DB_FILE = path.join(__dirname, '..', 'data', 'pwb.sqlite');
const DATA_JSON_PATH = path.join(__dirname, '..', 'data.json');
const BACKUP_PATH = path.join(__dirname, '..', 'data.json.bak');

/**
 * 创建所有数据表（与 encryption-enabled.js 保持同步）
 */
function createTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      open_id_enc TEXT NOT NULL,
      nickname_enc TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('child', 'parent')),
      invite_code TEXT,
      bound_to TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS medication_plans (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      nickname_enc TEXT NOT NULL,
      dosage_enc TEXT NOT NULL,
      schedule_enc TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS med_confirmations (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      confirmed_date TEXT NOT NULL,
      confirmed_at TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES medication_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(parent_id, plan_id, confirmed_date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS werun_data (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      steps INTEGER NOT NULL,
      data_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(parent_id, data_date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_confirms (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      date TEXT NOT NULL,
      med_taken INTEGER NOT NULL,
      confirmed_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(parent_id, date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_med_confirms (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      date TEXT NOT NULL,
      answer TEXT NOT NULL,
      confirmed_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(parent_id, date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS reminder_settings (
      parent_id TEXT PRIMARY KEY,
      reminder_times TEXT NOT NULL,
      subscribe_authorized INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS child_feedback (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      feedback_type TEXT,
      report_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS anxiety_surveys (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      answers_enc TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      type TEXT,
      target_id TEXT,
      message_enc TEXT,
      sent_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS safety_checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_start DATE NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, week_start, item_id)
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_med_plans_parent ON medication_plans(parent_id);
    CREATE INDEX IF NOT EXISTS idx_med_confirm_parent ON med_confirmations(parent_id);
    CREATE INDEX IF NOT EXISTS idx_werun_parent ON werun_data(parent_id);
    CREATE INDEX IF NOT EXISTS idx_daily_confirms_parent ON daily_confirms(parent_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_confirms_parent ON weekly_med_confirms(parent_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_parent ON child_feedback(parent_id);
    CREATE INDEX IF NOT EXISTS idx_surveys_child ON anxiety_surveys(child_id);
  `);
}

/**
 * 备份原始 data.json
 */
function backupSourceFile() {
  if (fs.existsSync(DATA_JSON_PATH)) {
    fs.copyFileSync(DATA_JSON_PATH, BACKUP_PATH);
    console.log('[Migrate] 原始 data.json 已备份到 data.json.bak');
    return true;
  } else {
    console.log('[Migrate] 未找到 data.json，无需迁移');
    return false;
  }
}

/**
 * 读取 data.json 数据
 */
function loadJsonData() {
  if (!fs.existsSync(DATA_JSON_PATH)) {
    return null;
  }
  const raw = fs.readFileSync(DATA_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * 生成邀请码（与 store.js 保持一致）
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * 迁移用户数据
 */
function migrateUsers(db, users) {
  console.log(`[Migrate] 迁移 ${users.length} 个用户...`);

  for (const user of users) {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (existing) {
      console.log(`[Migrate] 用户 ${user.id} 已存在，跳过`);
      continue;
    }

    const encrypted = encryptFields({
      id: user.id,
      open_id: user.open_id || `migrated_${user.id}`,
      role: user.role,
      nickname: user.nickname || (user.role === 'parent' ? '爸爸/妈妈' : '子女'),
      invite_code: user.invite_code || (user.role === 'parent' ? generateInviteCode() : null),
      bound_to: user.bound_to ? JSON.stringify(user.bound_to) : null,
      created_at: user.created_at || new Date().toISOString()
    }, ['open_id', 'nickname', 'invite_code']);

    const stmt = db.prepare(`
      INSERT INTO users (id, open_id_enc, nickname_enc, role, invite_code, bound_to, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      encrypted.id,
      encrypted.open_id,
      encrypted.nickname,
      encrypted.role,
      encrypted.invite_code,
      encrypted.bound_to,
      encrypted.created_at
    );
    console.log(`[Migrate] 用户 ${user.id} (${user.role}) 迁移完成`);
  }
}

/**
 * 迁移用药计划
 */
function migrateMedicationPlans(db, plans) {
  console.log(`[Migrate] 迁移 ${plans.length} 个用药计划...`);

  for (const plan of plans) {
    const existing = db.prepare('SELECT * FROM medication_plans WHERE id = ?').get(plan.id);
    if (existing) {
      console.log(`[Migrate] 用药计划 ${plan.id} 已存在，跳过`);
      continue;
    }

    let scheduleJson = plan.schedule;
    if (typeof scheduleJson === 'string') {
      try { scheduleJson = JSON.parse(scheduleJson); } catch (e) { scheduleJson = { times: [] }; }
    }

    const encrypted = encryptFields({
      nickname: plan.nickname,
      dosage: plan.dosage,
      schedule: JSON.stringify(scheduleJson)
    }, ['nickname', 'dosage', 'schedule']);

    const stmt = db.prepare(`
      INSERT INTO medication_plans (id, parent_id, nickname_enc, dosage_enc, schedule_enc, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      plan.id,
      plan.parent_id,
      encrypted.nickname,
      encrypted.dosage,
      encrypted.schedule,
      plan.created_at || new Date().toISOString()
    );
    console.log(`[Migrate] 用药计划 ${plan.id} 迁移完成`);
  }
}
/**
 * 迁移用药确认
 */
function migrateMedConfirmations(db, confirms) {
  console.log(`[Migrate] 迁移 ${confirms.length} 个用药确认记录...`);

  for (const confirm of confirms) {
    // 检查引用的用药计划是否存在
    const plan = db.prepare('SELECT * FROM medication_plans WHERE id = ?').get(confirm.plan_id);
    if (!plan) {
      console.log(`[Migrate] 用药确认 ${confirm.id} 引用的用药计划 ${confirm.plan_id} 不存在，跳过`);
      continue;
    }

    // 检查是否已存在
    const existing = db.prepare(`
      SELECT * FROM med_confirmations
      WHERE parent_id = ? AND plan_id = ? AND confirmed_date = ?
    `).get(confirm.parent_id, confirm.plan_id, confirm.confirmed_date);

    if (existing) {
      console.log(`[Migrate] 用药确认 ${confirm.id} 已存在，跳过`);
      continue;
    }

    const stmt = db.prepare(`
      INSERT INTO med_confirmations (id, plan_id, parent_id, confirmed_date, confirmed_at, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      confirm.id,
      confirm.plan_id,
      confirm.parent_id,
      confirm.confirmed_date,
      confirm.confirmed_at || new Date().toISOString(),
      confirm.status
    );
    console.log(`[Migrate] 用药确认 ${confirm.id} 迁移完成`);
  }
}

/**
 * 迁移微信运动数据
 */
function migrateWerunData(db, werunRecords) {
  console.log(`[Migrate] 迁移 ${werunRecords.length} 条微信运动记录...`);

  for (const record of werunRecords) {
    const existing = db.prepare(`
      SELECT * FROM werun_data WHERE parent_id = ? AND data_date = ?
    `).get(record.parent_id, record.data_date);

    if (existing) {
      console.log(`[Migrate] 微信运动记录 ${record.id} 已存在，跳过`);
      continue;
    }

    const stmt = db.prepare(`
      INSERT INTO werun_data (id, parent_id, steps, data_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.parent_id,
      record.steps,
      record.data_date,
      record.created_at || new Date().toISOString()
    );
    console.log(`[Migrate] 微信运动记录 ${record.id} 迁移完成`);
  }
}

/**
 * 迁移子女反馈
 */
function migrateChildFeedback(db, feedbacks) {
  console.log(`[Migrate] 迁移 ${feedbacks.length} 条子女反馈...`);

  for (const feedback of feedbacks) {
    const existing = db.prepare('SELECT * FROM child_feedback WHERE id = ?').get(feedback.id);
    if (existing) {
      console.log(`[Migrate] 子女反馈 ${feedback.id} 已存在，跳过`);
      continue;
    }

    const stmt = db.prepare(`
      INSERT INTO child_feedback (id, child_id, parent_id, feedback_type, report_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      feedback.id,
      feedback.child_id,
      feedback.parent_id,
      feedback.feedback_type,
      feedback.report_id,
      feedback.created_at || new Date().toISOString()
    );
    console.log(`[Migrate] 子女反馈 ${feedback.id} 迁移完成`);
  }
}

/**
 * 迁移安全检查清单
 */
function migrateSafetyChecklists(db, checklists) {
  console.log(`[Migrate] 迁移 ${checklists.length} 条安全检查清单...`);

  for (const item of checklists) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO safety_checklists
        (user_id, week_start, item_id, item_name, completed, completed_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.user_id,
      item.week_start,
      item.item_id,
      item.item_name,
      item.completed ? 1 : 0,
      item.completed_at || null,
      item.notes || null
    );
  }
  console.log(`[Migrate] 安全检查清单迁移完成`);
}

/**
 * 主迁移函数
 */
function migrate() {
  console.log('========== 数据迁移开始 ==========');

  // 1. 备份源文件
  if (!backupSourceFile()) {
    console.log('[Migrate] 无源数据可迁移，退出');
    process.exit(0);
  }

  // 2. 确保 data 目录存在
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 3. 连接数据库
  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 4. 创建表
  createTables(db);
  console.log('[Migrate] SQLite 数据库已初始化');

  // 5. 读取JSON数据
  const jsonData = loadJsonData();
  if (!jsonData) {
    console.log('[Migrate] data.json 为空或无法解析');
    process.exit(1);
  }

  // 6. 迁移各表数据
  if (jsonData.users) migrateUsers(db, jsonData.users);
  if (jsonData.medication_plans) migrateMedicationPlans(db, jsonData.medication_plans);
  if (jsonData.med_confirmations) migrateMedConfirmations(db, jsonData.med_confirmations);
  if (jsonData.werun_data) migrateWerunData(db, jsonData.werun_data);
  if (jsonData.child_feedback) migrateChildFeedback(db, jsonData.child_feedback);
  if (jsonData.safety_checklists) migrateSafetyChecklists(db, jsonData.safety_checklists);

  console.log('========== 数据迁移完成 ==========');
  console.log('[Migrate] 提示：迁移后可删除 data.json 或保留作备份');
  db.close();
  process.exit(0);
}

// 执行迁移
migrate().catch(err => {
  console.error('[Migrate] 迁移失败:', err);
  process.exit(1);
});
