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
const { getDB } = require('../db/store');

const router = express.Router();

// 量表问题
const QUESTIONS = [
  {
    id: 'anxiety_worry',
    text: '过去一周，你对父母身体的担心程度是？',
    scale: { min: 1, minLabel: '完全不担心', max: 10, maxLabel: '非常担心' }
  },
  {
    id: 'anxiety_contact',
    text: '过去一周，你想联系父母但没联系的次数多吗？',
    scale: { min: 1, minLabel: '从没有', max: 10, maxLabel: '经常有' }
  },
  {
    id: 'anxiety_sleep',
    text: '过去一周，因为担心父母而影响睡眠的情况？',
    scale: { min: 1, minLabel: '完全没有', max: 10, maxLabel: '几乎每天' }
  }
];

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
