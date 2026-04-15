const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', '..', 'data.json');

const CHECKLIST_ITEMS = [
  { id: 1, name: "检查燃气阀门是否关闭", category: "燃气安全" },
  { id: 2, name: "检查水龙头是否关紧", category: "用水安全" },
  { id: 3, name: "检查电源插座是否拔除", category: "用电安全" },
  { id: 4, name: "检查窗户是否锁好", category: "防盗安全" },
  { id: 5, name: "确认紧急联系人可见", category: "应急准备" },
  { id: 6, name: "检查楼梯扶手稳固", category: "防跌倒" },
  { id: 7, name: "确认药品存放在阴凉处", category: "药品安全" },
  { id: 8, name: "检查烟雾报警器电池", category: "火灾预防" }
];

function loadDB() {
  const defaultData = {
    users: [],
    medication_plans: [],
    med_confirmations: [],
    werun_data: [],
    daily_summaries: [],
    child_feedback: [],
    safety_checklists: []
  };
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!Array.isArray(raw.safety_checklists)) {
        raw.safety_checklists = [];
      }
      return { ...defaultData, ...raw };
    } catch (e) {
      console.error('[Checklist] 读取 data.json 失败:', e);
      return defaultData;
    }
  }
  return defaultData;
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[Checklist] 保存失败:', e);
    throw e;
  }
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return monday.toISOString().split('T')[0];
}

module.exports = {
  getWeekStart,

  getWeeklyChecklist: (uid, weekStart) => {
    try {
      const db = loadDB();
      const baseItems = CHECKLIST_ITEMS.map(i => ({
        ...i,
        completed: false,
        completed_at: null,
        notes: ''
      }));
      if (!db.safety_checklists) return baseItems;
      const records = db.safety_checklists.filter(
        r => r.user_id === uid && r.week_start === weekStart
      );
      baseItems.forEach(item => {
        const rec = records.find(r => r.item_id === item.id);
        if (rec) {
          item.completed = Boolean(rec.completed);
          item.completed_at = rec.completed_at;
          item.notes = rec.notes || '';
        }
      });
      return baseItems;
    } catch (e) {
      console.error('[Checklist] getWeeklyChecklist 异常:', e);
      throw e;
    }
  },

  completeItem: (uid, weekStart, itemId, notes = '') => {
    try {
      const db = loadDB();
      if (!db.safety_checklists) db.safety_checklists = [];
      const itemName = CHECKLIST_ITEMS.find(i => i.id === itemId)?.name || '';
      const idx = db.safety_checklists.findIndex(
        r => r.user_id === uid && r.week_start === weekStart && r.item_id === itemId
      );
      const now = new Date().toISOString();
      if (idx >= 0) {
        db.safety_checklists[idx] = {
          ...db.safety_checklists[idx],
          completed: true,
          completed_at: now,
          notes,
          updated_at: now
        };
      } else {
        db.safety_checklists.push({
          user_id: uid,
          week_start: weekStart,
          item_id: itemId,
          item_name: itemName,
          completed: true,
          completed_at: now,
          notes,
          created_at: now,
          updated_at: now
        });
      }
      saveDB(db);
      return { changes: 1 };
    } catch (e) {
      console.error('[Checklist] completeItem 异常:', e);
      throw e;
    }
  },

  getHistory: (uid, limit = 4) => {
    try {
      const db = loadDB();
      if (!db.safety_checklists) return [];
      const weeks = {};
      db.safety_checklists.forEach(r => {
        if (r.user_id !== uid) return;
        const ws = r.week_start;
        if (!weeks[ws]) weeks[ws] = { week_start: ws, total: 0, done: 0 };
        weeks[ws].total++;
        if (r.completed) weeks[ws].done++;
      });
      return Object.values(weeks)
        .sort((a, b) => b.week_start.localeCompare(a.week_start))
        .slice(0, limit);
    } catch (e) {
      console.error('[Checklist] getHistory 异常:', e);
      throw e;
    }
  }
};
