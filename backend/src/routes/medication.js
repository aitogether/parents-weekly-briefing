const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/init');

const router = express.Router();

/**
 * POST /v1/medication/plan
 * 创建用药计划
 */
router.post('/plan', (req, res) => {
  const { parent_id, nickname, dosage, schedule, created_by } = req.body;

  if (!parent_id || !nickname || !dosage || !schedule) {
    return res.status(400).json({ error: 'parent_id, nickname, dosage, schedule are required' });
  }

  const db = getDB();
  const id = crypto.randomUUID();
  const schedule_json = typeof schedule === 'string' ? schedule : JSON.stringify(schedule);

  db.prepare(
    `INSERT INTO medication_plans (id, parent_id, nickname, dosage, schedule_json, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(id, parent_id, nickname, dosage, schedule_json, created_by || 'system');

  res.json({ success: true, plan_id: id });
});

/**
 * GET /v1/medication/plans?parent_id=xxx
 * 列出用药计划
 */
router.get('/plans', (req, res) => {
  const { parent_id } = req.query;

  if (!parent_id) {
    return res.status(400).json({ error: 'parent_id is required' });
  }

  const db = getDB();
  const plans = db.prepare(
    `SELECT * FROM medication_plans WHERE parent_id = ? ORDER BY created_at DESC`
  ).all(parent_id);

  res.json({ plans });
});

/**
 * POST /v1/medication/confirm
 * 父母端确认用药（req.body.role 必须为 parent，否则 403）
 */
router.post('/confirm', (req, res) => {
  const { plan_id, parent_id, scheduled_time, status, role } = req.body;

  if (role !== 'parent') {
    return res.status(403).json({ error: 'Only parent role can confirm medication' });
  }

  if (!plan_id || !parent_id || !status) {
    return res.status(400).json({ error: 'plan_id, parent_id, status are required' });
  }

  if (!['taken', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'status must be "taken" or "skipped"' });
  }

  const db = getDB();
  const id = uuidv4();
  const confirmed_at = status === 'taken' ? new Date().toISOString() : null;

  db.prepare(
    `INSERT INTO med_confirmations (id, plan_id, parent_id, scheduled_time, confirmed_at, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, plan_id, parent_id, scheduled_time || new Date().toISOString().slice(0, 10), confirmed_at, status);

  res.json({ success: true, confirmation_id: id });
});

/**
 * GET /v1/medication/stats?parent_id=xxx&days=7
 * 返回完成率统计
 */
router.get('/stats', (req, res) => {
  const { parent_id, days = '7' } = req.query;

  if (!parent_id) {
    return res.status(400).json({ error: 'parent_id is required' });
  }

  const db = getDB();
  const n = parseInt(days, 10) || 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const rows = db.prepare(
    `SELECT status, COUNT(*) as cnt FROM med_confirmations
     WHERE parent_id = ? AND scheduled_time >= ?
     GROUP BY status`
  ).all(parent_id, cutoffStr);

  let total = 0;
  let taken = 0;
  for (const r of rows) {
    total += r.cnt;
    if (r.status === 'taken') taken += r.cnt;
  }

  const rate = total > 0 ? Math.round((taken / total) * 100) : 100;

  res.json({
    parent_id,
    days: n,
    total,
    taken,
    skipped: total - taken,
    completion_rate: rate
  });
});

module.exports = router;
