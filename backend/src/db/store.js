/**
 * JSON 文件存储（P0 MVP，不依赖原生编译）
 * 后续可替换为 better-sqlite3 或 PostgreSQL
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, '..', '..', 'data.json');

function load() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return {
    medication_plans: [],
    med_confirmations: [],
    werun_data: [],
    daily_summaries: [],
    child_feedback: []
  };
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function initDB() {
  // 确保数据文件存在
  if (!fs.existsSync(DB_FILE)) {
    save(load());
    console.log('[DB] data.json initialized');
  }
}

function getDB() {
  return {
    // --- 用药计划 ---
    createMedPlan({ parent_id, nickname, dosage, schedule }) {
      const db = load();
      const plan = { id: uuidv4(), parent_id, nickname, dosage, schedule, created_at: new Date().toISOString() };
      db.medication_plans.push(plan);
      save(db);
      return plan;
    },
    getMedPlans(parent_id) {
      const db = load();
      return db.medication_plans.filter(p => p.parent_id === parent_id);
    },
    // --- 用药确认 ---
    confirmMed({ plan_id, parent_id, status, confirm_date }) {
      const db = load();
      const useDate = confirm_date || new Date().toISOString().slice(0, 10);
      const record = {
        id: uuidv4(), plan_id, parent_id,
        confirmed_date: useDate,
        confirmed_at: new Date().toISOString(), status
      };
      // 去重：同一天同一条计划只保留最后一次确认
      db.med_confirmations = db.med_confirmations.filter(
        c => !(c.plan_id === plan_id && c.confirmed_date === record.confirmed_date)
      );
      db.med_confirmations.push(record);
      save(db);
      return record;
    },
    getMedConfirmations(parent_id, days = 7) {
      const db = load();
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      return db.med_confirmations.filter(c => c.parent_id === parent_id && c.confirmed_date >= since);
    },
    // --- 微信运动 ---
    addWerunData({ parent_id, steps, data_date }) {
      const db = load();
      const record = { id: uuidv4(), parent_id, steps, data_date, created_at: new Date().toISOString() };
      db.werun_data = db.werun_data.filter(w => !(w.parent_id === parent_id && w.data_date === data_date));
      db.werun_data.push(record);
      save(db);
      return record;
    },
    getWerunData(parent_id, days = 7) {
      const db = load();
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      return db.werun_data
        .filter(w => w.parent_id === parent_id && w.data_date >= since)
        .sort((a, b) => a.data_date.localeCompare(b.data_date));
    },
    // --- 子女回声 ---
    addFeedback({ child_id, parent_id, feedback_type, report_id }) {
      const db = load();
      const record = {
        id: uuidv4(), child_id, parent_id, feedback_type, report_id,
        created_at: new Date().toISOString()
      };
      db.child_feedback.push(record);
      save(db);
      return record;
    },
    getLatestFeedback(parent_id, days = 7) {
      const db = load();
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const feedbacks = db.child_feedback
        .filter(f => f.parent_id === parent_id && f.created_at >= since)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return feedbacks[0] || null;
    }
  };
}

module.exports = { initDB, getDB };
