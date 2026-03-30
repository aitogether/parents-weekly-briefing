const express = require('express');
const { getDB } = require('../db/store');

const router = express.Router();

// POST /med/plan — 创建用药计划
router.post('/plan', (req, res) => {
  const { parent_id, nickname, dosage, schedule } = req.body;
  if (!parent_id || !nickname || !dosage || !schedule) {
    return res.status(400).json({ error: 'parent_id, nickname, dosage, schedule required' });
  }
  const db = getDB();
  const plan = db.createMedPlan({ parent_id, nickname, dosage, schedule });
  res.json({ success: true, plan });
});

// GET /med/plans?parent_id=xxx
router.get('/plans', (req, res) => {
  const { parent_id } = req.query;
  if (!parent_id) return res.status(400).json({ error: 'parent_id required' });
  const db = getDB();
  res.json(db.getMedPlans(parent_id));
});

// POST /med/confirm — 父母确认用药（role 必须为 parent）
router.post('/confirm', (req, res) => {
  const { plan_id, parent_id, status, role, confirm_date } = req.body;
  if (role !== 'parent') {
    return res.status(403).json({ error: 'Only parent role can confirm medication' });
  }
  if (!plan_id || !parent_id || !status) {
    return res.status(400).json({ error: 'plan_id, parent_id, status required' });
  }
  if (!['taken', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'status must be "taken" or "skipped"' });
  }
  const db = getDB();
  const record = db.confirmMed({ plan_id, parent_id, status, confirm_date });
  res.json({ success: true, confirmation: record });
});

// GET /med/stats?parent_id=xxx&days=7
router.get('/stats', (req, res) => {
  const { parent_id, days = '7' } = req.query;
  if (!parent_id) return res.status(400).json({ error: 'parent_id required' });
  const db = getDB();
  const records = db.getMedConfirmations(parent_id, parseInt(days, 10) || 7);
  const d = parseInt(days, 10) || 7;
  const taken = records.filter(r => r.status === 'taken').length;
  res.json({
    parent_id,
    days: d,
    total: records.length,
    taken,
    skipped: records.length - taken,
    completion_rate: Math.round((taken / d) * 100)
  });
});

// ── v0.2 新增接口 ──

// POST /med/daily-confirm — 每日一键确认（v0.2）
router.post('/daily-confirm', (req, res) => {
  const { parent_id, role, med_taken } = req.body;
  if (role !== 'parent') {
    return res.status(403).json({ error: 'Only parent role can confirm' });
  }
  if (!parent_id) {
    return res.status(400).json({ error: 'parent_id required' });
  }
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const record = db.addDailyConfirm({ parent_id, date: today, med_taken: !!med_taken });
  res.json({ success: true, record });
});

// POST /med/weekly-confirm — 每周用药确认（v0.2，周日调用）
router.post('/weekly-confirm', (req, res) => {
  const { parent_id, answer } = req.body;
  if (!parent_id || !answer) {
    return res.status(400).json({ error: 'parent_id and answer required' });
  }
  const validAnswers = ['taken', 'missed_1_2', 'missed_3_4', 'missed_5plus'];
  if (!validAnswers.includes(answer)) {
    return res.status(400).json({ error: 'answer must be one of: ' + validAnswers.join(', ') });
  }
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);
  const record = db.addWeeklyMedConfirm({ parent_id, date: today, answer });
  res.json({ success: true, record });
});

// GET /med/reminder-settings?parent_id=xxx
router.get('/reminder-settings', (req, res) => {
  const { parent_id } = req.query;
  if (!parent_id) return res.status(400).json({ error: 'parent_id required' });
  const db = getDB();
  const settings = db.getReminderSettings(parent_id);
  res.json(settings || { reminder_times: ['09:00', '21:00'], subscribe_authorized: false });
});

// POST /med/reminder-settings — 保存用药提醒时间（v0.2）
router.post('/reminder-settings', (req, res) => {
  const { parent_id, reminder_times } = req.body;
  if (!parent_id || !reminder_times) {
    return res.status(400).json({ error: 'parent_id and reminder_times required' });
  }
  if (!Array.isArray(reminder_times) || reminder_times.length === 0 || reminder_times.length > 3) {
    return res.status(400).json({ error: 'reminder_times must be an array of 1-3 time strings (HH:MM)' });
  }
  const db = getDB();
  const settings = db.saveReminderSettings(parent_id, reminder_times);
  res.json({ success: true, settings });
});

// POST /med/send-reminder — 发送用药提醒（供定时任务或手动调用）
router.post('/send-reminder', (req, res) => {
  const { parent_id, message } = req.body;
  if (!parent_id) {
    return res.status(400).json({ error: 'parent_id required' });
  }
  // TODO: 调用微信订阅消息 API
  // 当前仅记录日志
  console.log(`[Reminder] 发送给 ${parent_id}: ${message || '该吃药啦 💊'}`);
  res.json({ success: true, message: '提醒已发送（mock）' });
});

module.exports = router;
