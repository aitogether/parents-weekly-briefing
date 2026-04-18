/**
 * 焦虑感自报量表（P1-7）
 *
 * 设计：
 * - 首次使用 + 每4周一次 + 退出时
 * - 1-10 分量表
 * - 问题："过去一周，你对父母身体的担心程度是？"
 * - 数据供内测分析用
 */

const express = require('express');
const { getDB } = require('../db/encryption-enabled');
const { authMiddleware, checkOwnership } = require('../middleware/auth');
const { validators, validate } = require('../middleware/validation');

const router = express.Router();

// 所有调查相关路由需要认证 + 所有权校验

// POST /survey/submit — 提交调查问卷（子女为父母提交）
router.post('/submit', authMiddleware, checkOwnership('parent_id'), validate([
  validators.childId(),
  validators.parentId(),
  validators.surveyAnswers()
]), (req, res) => {
  const { child_id, parent_id, answers } = req.body;
  const db = getDB();
  const record = db.submitSurvey({ child_id, parent_id, answers });
  res.json({ success: true, survey: record });
});

// POST /survey/anxiety — 提交焦虑量表
router.post('/anxiety', (req, res) => {
  const { child_id, answers } = req.body;

  if (!child_id) {
    return res.status(400).json({ error: 'child_id required' });
  }

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers array required' });
  }

  // 验证每个答案
  for (const a of answers) {
    if (!a.question_id || a.score === undefined) {
      return res.status(400).json({ error: 'each answer needs question_id and score' });
    }
    if (a.score < 1 || a.score > 10) {
      return res.status(400).json({ error: 'score must be 1-10' });
    }
  }

  const db = getDB();
  const record = db.addAnxietySurvey({
    child_id,
    answers,
    submitted_at: new Date().toISOString()
  });

  const avgScore = Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length * 10) / 10;

  res.json({
    success: true,
    record_id: record.id,
    avg_score: avgScore,
    message: avgScore <= 3
      ? '你对爸妈的状态很放心，继续保持关注就好。'
      : avgScore <= 6
        ? '有些担心是正常的，建议多和爸妈聊聊。'
        : '你的担心比较多，建议尽快和爸妈沟通，或了解他们的近况。'
  });
});

// GET /survey/anxiety/history?child_id=xxx — 查看历史
router.get('/anxiety/history', (req, res) => {
  const { child_id, limit = '10' } = req.query;
  if (!child_id) {
    return res.status(400).json({ error: 'child_id required' });
  }

  const db = getDB();
  const history = db.getAnxietyHistory(child_id, parseInt(limit, 10) || 10);

  res.json({
    child_id,
    total: history.length,
    history: history.map(h => ({
      id: h.id,
      submitted_at: h.submitted_at,
      avg_score: Math.round(h.answers.reduce((s, a) => s + a.score, 0) / h.answers.length * 10) / 10,
      answers: h.answers
    }))
  });
});

// GET /survey/anxiety/questions — 获取量表问题
router.get('/anxiety/questions', (req, res) => {
  res.json({ questions: QUESTIONS });
});

module.exports = router;
