const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db/init');

const router = express.Router();

/**
 * POST /v1/werun/decrypt
 * 接收微信运动加密数据，mock 解密后存入数据库
 */
router.post('/decrypt', (req, res) => {
  const { encryptedData, iv, parent_id } = req.body;

  if (!parent_id) {
    return res.status(400).json({ error: 'parent_id is required' });
  }

  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  // Mock: 生成一个随机步数
  const mockSteps = Math.floor(Math.random() * 5000) + 1000;

  const stmt = db.prepare(
    `INSERT INTO werun_data (id, parent_id, step_count, data_date, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  );
  stmt.run(crypto.randomUUID(), parent_id, mockSteps, today);

  res.json({
    success: true,
    data: {
      parent_id,
      step_count: mockSteps,
      data_date: today,
      note: 'mock decryption, real data pending wechat integration'
    }
  });
});

/**
 * GET /v1/werun/steps?parent_id=xxx&days=7
 * 返回过去 N 天的步数数组
 */
router.get('/steps', (req, res) => {
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
    `SELECT data_date, step_count FROM werun_data
     WHERE parent_id = ? AND data_date >= ?
     ORDER BY data_date ASC`
  ).all(parent_id, cutoffStr);

  res.json({
    parent_id,
    days: n,
    steps: rows.map(r => ({
      date: r.data_date,
      step_count: r.step_count
    }))
  });
});

module.exports = router;
