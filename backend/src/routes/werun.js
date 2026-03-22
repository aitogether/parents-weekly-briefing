const express = require('express');
const { getDB } = require('../db/store');

const router = express.Router();

// POST /werun/decrypt — Mock: 注入步数（支持 data_date + steps 参数）
router.post('/decrypt', (req, res) => {
  const { parent_id, steps, data_date } = req.body;
  if (!parent_id) return res.status(400).json({ error: 'parent_id required' });

  const db = getDB();
  const useDate = data_date || new Date().toISOString().slice(0, 10);
  const useSteps = typeof steps === 'number' ? steps : Math.floor(Math.random() * 5000) + 1000;
  const record = db.addWerunData({ parent_id, steps: useSteps, data_date: useDate });

  res.json({ success: true, data: record, note: 'mock, real wechat integration pending' });
});

// GET /werun/steps?parent_id=xxx&days=7
router.get('/steps', (req, res) => {
  const { parent_id, days = '7' } = req.query;
  if (!parent_id) return res.status(400).json({ error: 'parent_id required' });

  const db = getDB();
  const rows = db.getWerunData(parent_id, parseInt(days, 10) || 7);
  res.json({ parent_id, steps: rows.map(r => ({ date: r.data_date, step_count: r.steps })) });
});

module.exports = router;
