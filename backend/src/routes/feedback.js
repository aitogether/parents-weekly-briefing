const express = require('express');
const { getDB } = require('../db/encryption-enabled');
const { authMiddleware, checkOwnership } = require('../middleware/auth');
const { validators, validate } = require('../middleware/validation');

const router = express.Router();

// 所有反馈相关路由需要认证 + 所有权校验

// POST /feedback/create — 提交反馈（子女可提交父母的反馈）
router.post('/create', authMiddleware, checkOwnership('parent_id'), validate([
  validators.childId(),
  validators.parentId(),
  validators.feedbackType()
]), (req, res) => {
  const { child_id, parent_id, feedback_type, report_id } = req.body;
  const db = getDB();
  const record = db.addFeedback({ child_id, parent_id, feedback_type, report_id });
  res.json({ success: true, feedback: record });
});

// GET /feedback/options — 返回三档选项
router.get('/options', (req, res) => {
  res.json(FEEDBACK_OPTIONS);
});

// POST /feedback — 子女提交回声
router.post('/', validate([
  validators.childId(),
  validators.parentId(),
  validators.feedbackType()
]), (req, res) => {
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