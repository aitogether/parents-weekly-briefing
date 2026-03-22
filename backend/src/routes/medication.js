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

module.exports = router;
