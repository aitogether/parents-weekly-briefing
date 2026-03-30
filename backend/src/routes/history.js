/**
 * 周报历史浏览 + 多周趋势对比（P2-1 + P2-4）
 *
 * GET /report/history?child_id=xxx&weeks=4
 * GET /report/compare?child_id=xxx&weeks=4
 */

const express = require('express');
const { getDB } = require('../db/store');

const router = express.Router();

// ── 历史周报列表 ──
router.get('/history', (req, res) => {
  const { child_id, weeks = '4' } = req.query;
  if (!child_id) return res.status(400).json({ error: 'child_id required' });

  const db = getDB();
  const maxWeeks = Math.min(parseInt(weeks, 10) || 4, 12);

  // 获取绑定的父母
  const child = db.getUserById(child_id);
  if (!child || child.role !== 'child') return res.status(400).json({ error: 'invalid child_id' });

  const parentIds = child.role === 'child' && child.bound_to
    ? (Array.isArray(child.bound_to) ? child.bound_to : [child.bound_to])
    : [];
  if (parentIds.length === 0) return res.json({ weeks: [] });

  // 为每一周生成历史数据
  const now = new Date();
  const history = [];

  for (let w = 0; w < maxWeeks; w++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    const fmt = d => `${d.getMonth() + 1}月${d.getDate()}日`;

    const weekData = {
      weekRange: `${fmt(weekStart)} - ${fmt(weekEnd)}`,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      parents: []
    };

    for (const pid of parentIds) {
      const parent = db.getUserById(pid);
      if (!parent) continue;

      const steps = db.getWerunData(pid, 7);
      const medConfirms = db.getDailyConfirms(pid, 7);

      // 过滤到当前周范围
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);
      const weekSteps = steps.filter(s => s.data_date >= weekStartStr && s.data_date <= weekEndStr);
      const weekMeds = medConfirms.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);

      const avgSteps = weekSteps.length > 0
        ? Math.round(weekSteps.reduce((s, r) => s + r.steps, 0) / weekSteps.length)
        : 0;

      const takenDays = weekMeds.filter(m => m.med_taken).length;
      const medRate = weekMeds.length > 0 ? Math.round((takenDays / 7) * 100) : 0;

      // 灯号
      let level = 'green';
      if (avgSteps < 500 || medRate < 60) level = 'red';
      else if (avgSteps < 1500 || medRate < 80) level = 'yellow';

      weekData.parents.push({
        id: pid,
        label: parent.nickname || (parent.gender === 'father' ? '爸' : '妈'),
        level,
        avgSteps,
        medRate,
        dataDays: weekSteps.length
      });
    }

    // 周整体灯号
    const allLevels = weekData.parents.map(p => p.level);
    weekData.level = allLevels.includes('red') ? 'red' : allLevels.includes('yellow') ? 'yellow' : 'green';

    history.push(weekData);
  }

  res.json({
    child_id,
    totalWeeks: history.length,
    weeks: history
  });
});

// ── 多周趋势对比 ──
router.get('/compare', (req, res) => {
  const { child_id, weeks = '4' } = req.query;
  if (!child_id) return res.status(400).json({ error: 'child_id required' });

  const db = getDB();
  const maxWeeks = Math.min(parseInt(weeks, 10) || 4, 12);

  const child = db.getUserById(child_id);
  if (!child || child.role !== 'child') return res.status(400).json({ error: 'invalid child_id' });

  const parentIds = Array.isArray(child.bound_to) ? child.bound_to : [child.bound_to].filter(Boolean);

  const now = new Date();
  const trends = [];

  for (const pid of parentIds) {
    const parent = db.getUserById(pid);
    if (!parent) continue;

    const weeklyTrend = [];

    for (let w = 0; w < maxWeeks; w++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const wsStr = weekStart.toISOString().slice(0, 10);
      const weStr = weekEnd.toISOString().slice(0, 10);

      const allSteps = db.getWerunData(pid, 30);
      const weekSteps = allSteps.filter(s => s.data_date >= wsStr && s.data_date <= weStr);

      const allMeds = db.getDailyConfirms(pid, 30);
      const weekMeds = allMeds.filter(m => m.date >= wsStr && m.date <= weStr);

      const avgSteps = weekSteps.length > 0
        ? Math.round(weekSteps.reduce((s, r) => s + r.steps, 0) / weekSteps.length)
        : 0;

      const takenDays = weekMeds.filter(m => m.med_taken).length;
      const medRate = weekMeds.length > 0 ? Math.round((takenDays / 7) * 100) : 0;

      let level = 'green';
      if (avgSteps < 500 || medRate < 60) level = 'red';
      else if (avgSteps < 1500 || medRate < 80) level = 'yellow';

      weeklyTrend.push({
        weekIndex: w,
        weekLabel: w === 0 ? '本周' : `${w}周前`,
        avgSteps,
        medRate,
        level
      });
    }

    // 趋势判断
    const stepsTrend = weeklyTrend.map(w => w.avgSteps);
    const medTrend = weeklyTrend.map(w => w.medRate);
    const levelTrend = weeklyTrend.map(w => w.level);

    let overallStepsTrend = 'stable';
    if (stepsTrend.length >= 2) {
      const recent = stepsTrend.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const earlier = stepsTrend.slice(-2).reduce((a, b) => a + b, 0) / 2;
      if (earlier > 0) {
        const pct = Math.round(((recent - earlier) / earlier) * 100);
        if (pct > 20) overallStepsTrend = 'improving';
        else if (pct < -20) overallStepsTrend = 'declining';
      }
    }

    let overallMedTrend = 'stable';
    if (medTrend.length >= 2) {
      const recent = medTrend.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const earlier = medTrend.slice(-2).reduce((a, b) => a + b, 0) / 2;
      if (recent > earlier + 10) overallMedTrend = 'improving';
      else if (recent < earlier - 10) overallMedTrend = 'declining';
    }

    trends.push({
      id: pid,
      label: parent.nickname || '爸妈',
      weekly: weeklyTrend,
      overallStepsTrend,
      overallMedTrend,
      greenWeeks: levelTrend.filter(l => l === 'green').length,
      yellowWeeks: levelTrend.filter(l => l === 'yellow').length,
      redWeeks: levelTrend.filter(l => l === 'red').length
    });
  }

  res.json({
    child_id,
    weeks: maxWeeks,
    trends
  });
});

module.exports = router;
