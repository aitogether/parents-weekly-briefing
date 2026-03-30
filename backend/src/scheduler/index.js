/**
 * 定时调度器（P1-3 周五推送 + P1-4 每日小结 + P1-5 用药提醒）
 *
 * MVP 版用 setInterval 检查，生产环境建议替换为 node-cron。
 * 
 * 推送方式：
 * - 当前为 mock（console.log + 存储通知记录）
 * - 接入微信订阅消息后替换 sendNotification()
 */

const { getDB } = require('../db/store');

// ── 通知记录（防重复） ──
const sentNotifications = new Map(); // key -> timestamp

function hasSentToday(key) {
  const last = sentNotifications.get(key);
  if (!last) return false;
  const now = new Date();
  const lastDate = new Date(last);
  return now.toDateString() === lastDate.toDateString();
}

function markSent(key) {
  sentNotifications.set(key, Date.now());
}

// ── 发送通知（mock） ──
function sendNotification(type, targetId, message) {
  const db = getDB();
  console.log(`[Scheduler][${type}] → ${targetId}: "${message}"`);
  // TODO: 微信订阅消息 API
  // wx.requestSubscribeMessage / 服务端 access_token 调用
  return { type, targetId, message, sentAt: new Date().toISOString() };
}

// ── 每日小结（P1-4） ──
// 每天 12:15 检查，给子女推今日小结
function checkDailySummary() {
  const now = new Date();
  if (now.getHours() !== 12 || now.getMinutes() < 15 || now.getMinutes() > 20) return;

  const db = getDB();
  const key = `daily_summary_${now.toISOString().slice(0, 10)}`;
  if (hasSentToday(key)) return;

  // 遍历所有父母用户
  const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'data.json'), 'utf8'));
  const parents = data.users.filter(u => u.role === 'parent');

  for (const parent of parents) {
    const todaySteps = db.getWerunData(parent.id, 1);
    const steps = todaySteps.length > 0 ? todaySteps[0].steps : 0;

    let status, message;
    if (steps >= 2000) {
      status = 'green';
      message = `${parent.nickname || '爸妈'}今天走了${steps}步，一切正常 👍`;
    } else if (steps >= 500) {
      status = 'yellow';
      message = `${parent.nickname || '爸妈'}今天走了${steps}步，活动量偏低`;
    } else {
      status = 'yellow';
      message = `${parent.nickname || '爸妈'}今天走动较少，晚点可以关心一下`;
    }

    // 通知绑定的子女
    if (Array.isArray(parent.bound_to)) {
      for (const childId of parent.bound_to) {
        sendNotification('daily_summary', childId, message);
      }
    }
  }

  markSent(key);
  console.log('[Scheduler] 每日小结已发送');
}

// ── 周五周报推送（P1-3） ──
// 每周五 17:00 检查
function checkFridayReport() {
  const now = new Date();
  if (now.getDay() !== 5) return; // 非周五不触发
  if (now.getHours() !== 17 || now.getMinutes() > 10) return;

  const key = `friday_report_${now.toISOString().slice(0, 10)}`;
  if (hasSentToday(key)) return;

  const db = getDB();
  const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'data.json'), 'utf8'));
  const parents = data.users.filter(u => u.role === 'parent');

  for (const parent of parents) {
    if (!Array.isArray(parent.bound_to) || parent.bound_to.length === 0) continue;

    // 获取配偶（简单匹配：同 bound_to 的另一个 parent）
    const otherParents = parents.filter(p =>
      p.id !== parent.id &&
      Array.isArray(p.bound_to) &&
      p.bound_to.some(cid => parent.bound_to.includes(cid))
    );

    if (otherParents.length === 0) continue;

    const parentAId = parent.id;
    const parentBId = otherParents[0].id;

    // 生成周报
    const reportRouter = require('../routes/report');
    // 内联调用（不走 HTTP）
    const pASteps = db.getWerunData(parentAId, 7);
    const pAMed = db.getDailyConfirms(parentAId, 7);
    const takenDays = pAMed.filter(r => r.med_taken).length;
    const rate = pAMed.length > 0 ? Math.round((takenDays / 7) * 100) : 0;
    const avgSteps = pASteps.length > 0 ? Math.round(pASteps.reduce((s, r) => s + r.steps, 0) / pASteps.length) : 0;

    let level = 'green';
    if (avgSteps < 500 || rate < 60) level = 'red';
    else if (avgSteps < 1500 || rate < 80) level = 'yellow';

    const messages = {
      green: `${parent.nickname || '爸妈'}这周都挺好。放心忙你的。`,
      yellow: `${parent.nickname || '爸妈'}整体稳定，有些数据需要留意。`,
      red: `${parent.nickname || '爸妈'}这周有些指标需要关注，请尽快查看。`
    };

    for (const childId of parent.bound_to) {
      sendNotification('friday_report', childId, messages[level]);
    }
  }

  markSent(key);
  console.log('[Scheduler] 周五周报通知已发送');
}

// ── 用药提醒（P1-5） ──
// 每分钟检查，看是否有父母到了提醒时间
function checkMedReminder() {
  const now = new Date();
  const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  const db = getDB();
  const data = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'data.json'), 'utf8'));

  if (!data.reminder_settings) return;

  for (const settings of data.reminder_settings) {
    if (!settings.reminder_times) continue;

    for (const schedTime of settings.reminder_times) {
      // 提前 10 分钟触发
      const [h, m] = schedTime.split(':').map(Number);
      let remindM = m - 10;
      let remindH = h;
      if (remindM < 0) { remindM += 60; remindH--; }
      if (remindH < 0) remindH += 24;
      const remindTime = String(remindH).padStart(2, '0') + ':' + String(remindM).padStart(2, '0');

      if (currentTime !== remindTime) continue;

      const key = `med_reminder_${settings.parent_id}_${now.toISOString().slice(0, 10)}_${schedTime}`;
      if (hasSentToday(key)) continue;

      // 检查今天是否已确认过
      const todayConfirms = db.getDailyConfirms(settings.parent_id, 1);
      if (todayConfirms.length > 0 && todayConfirms[0].med_taken) {
        markSent(key); // 已确认，跳过
        continue;
      }

      sendNotification('med_reminder', settings.parent_id, `💊 ${schedTime} 要吃药啦～`);
      markSent(key);
    }
  }
}

// ── 启动调度器 ──
function startScheduler() {
  console.log('[Scheduler] 定时调度器已启动');
  console.log('[Scheduler] - 每日 12:15 小结通知');
  console.log('[Scheduler] - 每周五 17:00 周报通知');
  console.log('[Scheduler] - 用药提醒（提前10分钟）');

  // 每分钟检查一次
  setInterval(() => {
    try {
      checkDailySummary();
      checkFridayReport();
      checkMedReminder();
    } catch (e) {
      console.error('[Scheduler] 检查出错:', e.message);
    }
  }, 60 * 1000);
}

module.exports = { startScheduler, sendNotification };
