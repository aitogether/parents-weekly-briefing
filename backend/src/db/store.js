/**
 * JSON 文件存储（P0 MVP，不依赖原生编译）
 * 后续可替换为 better-sqlite3 或 PostgreSQL
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, '..', '..', 'data.json');

// 生成6位邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的 I/O/0/1
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function load() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return {
    users: [],          // { id, open_id, role, nickname, invite_code, bound_to, created_at }
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
    // --- 用户系统 ---
    createUser({ open_id, role, nickname }) {
      const db = load();
      // 检查是否已存在
      const existing = db.users.find(u => u.open_id === open_id);
      if (existing) return existing;
      const user = {
        id: uuidv4(),
        open_id,
        role,           // 'child' | 'parent'
        nickname: nickname || (role === 'parent' ? '爸爸/妈妈' : '子女'),
        invite_code: role === 'parent' ? generateInviteCode() : null,
        bound_to: null, // child: parent_id; parent: [child_id, ...]
        created_at: new Date().toISOString()
      };
      db.users.push(user);
      save(db);
      return user;
    },
    getUserByOpenId(open_id) {
      const db = load();
      return db.users.find(u => u.open_id === open_id) || null;
    },
    getUserById(id) {
      const db = load();
      return db.users.find(u => u.id === id) || null;
    },
    getParentByInviteCode(code) {
      const db = load();
      return db.users.find(u => u.role === 'parent' && u.invite_code === code) || null;
    },
    bindChildToParent(child_id, parent_id) {
      const db = load();
      const child = db.users.find(u => u.id === child_id);
      const parent = db.users.find(u => u.id === parent_id);
      if (!child || !parent) return null;
      child.bound_to = parent_id;
      if (!parent.bound_to) parent.bound_to = [];
      if (Array.isArray(parent.bound_to) && !parent.bound_to.includes(child_id)) {
        parent.bound_to.push(child_id);
      }
      save(db);
      return { child, parent };
    },
    // 获取子女绑定的父母信息
    getBoundParent(child_id) {
      const db = load();
      const child = db.users.find(u => u.id === child_id);
      if (!child || !child.bound_to) return null;
      return db.users.find(u => u.id === child.bound_to) || null;
    },
    // 获取父母绑定的子女列表
    getBoundChildren(parent_id) {
      const db = load();
      const parent = db.users.find(u => u.id === parent_id);
      if (!parent || !Array.isArray(parent.bound_to)) return [];
      return parent.bound_to.map(cid => db.users.find(u => u.id === cid)).filter(Boolean);
    },

    // --- v0.2 每日确认 ---
    addDailyConfirm({ parent_id, date, med_taken }) {
      const db = load();
      if (!db.daily_confirms) db.daily_confirms = [];
      const record = { id: uuidv4(), parent_id, date, med_taken, confirmed_at: new Date().toISOString() };
      // 去重：同一天只保留最后一次
      db.daily_confirms = db.daily_confirms.filter(c => !(c.parent_id === parent_id && c.date === date));
      db.daily_confirms.push(record);
      save(db);
      return record;
    },
    getDailyConfirms(parent_id, days = 7) {
      const db = load();
      if (!db.daily_confirms) return [];
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      return db.daily_confirms.filter(c => c.parent_id === parent_id && c.date >= since);
    },

    // --- v0.2 每周用药确认 ---
    addWeeklyMedConfirm({ parent_id, date, answer }) {
      const db = load();
      if (!db.weekly_med_confirms) db.weekly_med_confirms = [];
      const record = { id: uuidv4(), parent_id, date, answer, confirmed_at: new Date().toISOString() };
      // 去重：同一天只保留最后一次
      db.weekly_med_confirms = db.weekly_med_confirms.filter(c => !(c.parent_id === parent_id && c.date === date));
      db.weekly_med_confirms.push(record);
      save(db);
      return record;
    },

    // --- v0.2 用药提醒设置 ---
    getReminderSettings(parent_id) {
      const db = load();
      if (!db.reminder_settings) return null;
      return db.reminder_settings.find(s => s.parent_id === parent_id) || null;
    },
    saveReminderSettings(parent_id, reminder_times) {
      const db = load();
      if (!db.reminder_settings) db.reminder_settings = [];
      const existing = db.reminder_settings.find(s => s.parent_id === parent_id);
      if (existing) {
        existing.reminder_times = reminder_times;
        existing.updated_at = new Date().toISOString();
      } else {
        db.reminder_settings.push({
          parent_id,
          reminder_times,
          subscribe_authorized: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      save(db);
      return db.reminder_settings.find(s => s.parent_id === parent_id);
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
    },

    // --- P1-7 焦虑量表 ---
    addAnxietySurvey({ child_id, answers, submitted_at }) {
      const db = load();
      if (!db.anxiety_surveys) db.anxiety_surveys = [];
      const record = { id: uuidv4(), child_id, answers, submitted_at };
      db.anxiety_surveys.push(record);
      save(db);
      return record;
    },
    getAnxietyHistory(child_id, limit = 10) {
      const db = load();
      if (!db.anxiety_surveys) return [];
      return db.anxiety_surveys
        .filter(s => s.child_id === child_id)
        .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
        .slice(0, limit);
    },

    // --- 通知日志 ---
    addNotificationLog({ type, target_id, message, sent_at }) {
      const db = load();
      if (!db.notification_logs) db.notification_logs = [];
      const record = { id: uuidv4(), type, target_id, message, sent_at };
      db.notification_logs.push(record);
      save(db);
      return record;
    }
  };
}

module.exports = { initDB, getDB };
