const db = require('../db/store');
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
module.exports = {
  getWeeklyChecklist: (uid, weekStart) => new Promise((res,rej)=>{ const items = CHECKLIST_ITEMS.map(i=>({...i,completed:false,completed_at:null,notes:''})); db.all(`SELECT * FROM safety_checklists WHERE user_id=? AND week_start=?`, [uid, weekStart], (err,rows)=>{ if(err) return rej(err); rows.forEach(r=>{ const it = items.find(i=>i.id===r.item_id); if(it){ it.completed=Boolean(r.completed); it.completed_at=r.completed_at; it.notes=r.notes||''; } }); res(items); }); }),
  completeItem: (uid, weekStart, itemId, notes) => new Promise((res,rej)=>{ db.run(`INSERT OR REPLACE INTO safety_checklists (user_id, week_start, item_id, item_name, completed, completed_at, notes, updated_at) VALUES (?,?,?,?,1,datetime('now'),?,datetime('now'))`, [uid, weekStart, itemId, CHECKLIST_ITEMS.find(i=>i.id===itemId)?.name||'', notes||''], function(err){ if(err) return rej(err); res({changes:this.changes}); }); }),
  getHistory: (uid, limit=4) => new Promise((res,rej)=>{ db.all(`SELECT week_start, COUNT(*) as total, SUM(CASE WHEN completed THEN 1 ELSE 0 END) as done FROM safety_checklists WHERE user_id=? GROUP BY week_start ORDER BY week_start DESC LIMIT ?`, [uid, limit], (err,rows)=>{ if(err) return rej(err); res(rows); }); }),
  getWeekStart: () => { const now=new Date(); const day=now.getDay()||7; const monday=new Date(now); monday.setDate(now.getDate()-day+1); return monday.toISOString().split('T')[0]; }
};
