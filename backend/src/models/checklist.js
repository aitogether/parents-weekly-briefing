const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '..', '..', 'data.json');

// 8 项安全检查清单
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
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  return { users: [], medication_plans: [], med_confirmations: [], werun_data: [], daily_summaries: [], child_feedback: [], safety_checklists: [] };
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
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
    const db = loadDB();
    // 基础清单（8 项，未完成）
    const baseItems = CHECKLIST_ITEMS.map(i => ({ ...i, completed: false, completed_at: null, notes: '' }));
    // 查询该用户该周的完成记录
    const records = db.safety_checklists.filter(r => r.user_id === uid && r.week_start === weekStart);
    // 合并状态
    baseItems.forEach(item => {
      const rec = records.find(r => r.item_id === item.id);
      if (rec) {
        item.completed = Boolean(rec.completed);
        item.completed_at = rec.completed_at;
        item.notes = rec.notes || '';
      }
    });
    return Promise.resolve(baseItems);
  },

  completeItem: (uid, weekStart, itemId, notes = '') => {
    const db = loadDB();
    const itemName = CHECKLIST_ITEMS.find(i => i.id === itemId)?.name || '';
    // 查找是否已有记录
    const idx = db.safety_checklists.findIndex(r => r.user_id === uid && r.week_start === weekStart && r.item_id === itemId);
    const now = new Date().toISOString();
    if (idx >= 0) {
      db.safety_checklists[idx] = { ...db.safety_checklists[idx], completed: true, completed_at: now, notes, updated_at: now };
    } else {
      db.safety_checklists.push({
        user_id: uid, week_start: weekStart, item_id: itemId, item_name: itemName,
        completed: true, completed_at: now, notes,
        created_at: now, updated_at: now
      });
    }
    saveDB(db);
    return Promise.resolve({ changes: 1 });
  },

  getHistory: (uid, limit = 4) => {
    const db = loadDB();
    const weeks = {};
    db.safety_checklists.forEach(r => {
      if (r.user_id !== uid) return;
      const ws = r.week_start;
      if (!weeks[ws]) weeks[ws] = { week_start: ws, total: 0, done: 0 };
      weeks[ws].total++;
      if (r.completed) weeks[ws].done++;
    });
    const arr = Object.values(weeks)
      .sort((a, b) => b.week_start.localeCompare(a.week_start))
      .slice(0, limit);
    return Promise.resolve(arr);
  }
};
