const express = require('express');
const { getDB } = require('../db/store');

const router = express.Router();

const FEEDBACK_OPTIONS = [
  { type: 'reassured', text: '今天我看过你的情况，一切放心。' },
  { type: 'concerned', text: '最近有点担心，改天好好跟你聊聊。' },
  { type: 'busy_caring', text: '我这几天有点忙，但一直惦记着你。' }
];

// GET /feedback/options — 返回三档选项
router.get('/options', (req, res) => {
  res.json(FEEDBACK_OPTIONS);
});

// POST /feedback — 子女提交回声
router.post('/', (req, res) => {
  const { child_id, parent_id, feedback_type, report_id } = req.body;
  if (!child_id || !parent_id || !feedback_type) {
    return res.status(400).json({ error: 'child_id, parent_id, feedback_type required' });
  }
  const option = FEEDBACK_OPTIONS.find(o => o.type === feedback_type);
  if (!option) {
    return res.status(400).json({ error: `feedback_type must be one of: ${FEEDBACK_OPTIONS.map(o => o.type).join(', ')}` });
  }
  const db = getDB();
  const record = db.addFeedback({ child_id, parent_id, feedback_type, report_id });
  res.json({ success: true, feedback: record, text: option.text });
});

// GET /feedback/latest?parent_id=xxx — 老人端获取最近7天的回声
router.get('/latest', (req, res) => {
  const { parent_id } = req.query;
  if (!parent_id) return res.status(400).json({ error: 'parent_id required' });
  const db = getDB();
  const latest = db.getLatestFeedback(parent_id, 7);
  if (!latest) return res.json({ has_feedback: false });
  const option = FEEDBACK_OPTIONS.find(o => o.type === latest.feedback_type);
  res.json({
    has_feedback: true,
    text: option ? option.text : latest.feedback_type,
    created_at: latest.created_at
  });
});

module.exports = router;
