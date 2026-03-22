const express = require('express');
const { getDB } = require('../db/init');

const router = express.Router();

/**
 * POST /v1/weekly-briefing/generate
 * 从数据库拉数据生成周报
 *
 * 灯号规则：
 *   步数日均 < 500 → yellow，< 200 → red
 *   用药完成率 < 80% → yellow，< 60% → red
 *   最终灯号取最差等级
 */
router.post('/generate', (req, res) => {
  const { parent_a_id, parent_b_id, week_start, week_end } = req.body;

  if (!parent_a_id || !parent_b_id) {
    return res.status(400).json({ error: 'parent_a_id and parent_b_id are required' });
  }

  const db = getDB();

  // 默认本周范围
  const now = new Date();
  const ws = week_start || (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();
  const we = week_end || now.toISOString().slice(0, 10);

  // --- Helper: 查询步数 ---
  function getSteps(parentId) {
    const rows = db.prepare(
      `SELECT data_date, step_count FROM werun_data
       WHERE parent_id = ? AND data_date >= ? AND data_date <= ?
       ORDER BY data_date ASC`
    ).all(parentId, ws, we);

    if (rows.length === 0) return { dailyAvg: 0, trend: 'stable', note: '本周暂无数据' };
    const total = rows.reduce((s, r) => s + r.step_count, 0);
    const avg = Math.round(total / rows.length);
    return {
      dailyAvg: avg,
      trend: 'stable',
      note: `共 ${rows.length} 天数据`
    };
  }

  // --- Helper: 查询用药完成率 ---
  function getMedStats(parentId) {
    const rows = db.prepare(
      `SELECT status, COUNT(*) as cnt FROM med_confirmations
       WHERE parent_id = ? AND scheduled_time >= ? AND scheduled_time <= ?
       GROUP BY status`
    ).all(parentId, ws, we + 'T23:59:59');

    let total = 0, taken = 0;
    for (const r of rows) {
      total += r.cnt;
      if (r.status === 'taken') taken += r.cnt;
    }
    const rate = total > 0 ? Math.round((taken / total) * 100) : 100;
    return { rate, trend: rate >= 80 ? 'stable' : 'down', note: `${taken}/${total} 次确认` };
  }

  // --- 灯号判断 ---
  function stepsLevel(avgSteps) {
    if (avgSteps < 200) return 'red';
    if (avgSteps < 500) return 'yellow';
    return 'green';
  }

  function medLevel(rate) {
    if (rate < 60) return 'red';
    if (rate < 80) return 'yellow';
    return 'green';
  }

  function worstLevel(levels) {
    if (levels.includes('red')) return 'red';
    if (levels.includes('yellow')) return 'yellow';
    return 'green';
  }

  // --- 汇总两家长数据 ---
  const parentASteps = getSteps(parent_a_id);
  const parentAMed = getMedStats(parent_a_id);
  const parentBSteps = getSteps(parent_b_id);

  const allLevels = [
    stepsLevel(parentASteps.dailyAvg),
    medLevel(parentAMed.rate),
    stepsLevel(parentBSteps.dailyAvg)
  ];
  const overallLevel = worstLevel(allLevels);

  const levelTitles = {
    green: { title: '本周不用操心', oneLiner: '爸妈这周都挺好，你可以放心忙自己的事。' },
    yellow: { title: '稍微留意一下', oneLiner: '有些数据不太理想，建议打个电话聊聊。' },
    red: { title: '需要关注', oneLiner: '本周有红灯指标，请尽快联系爸妈。' }
  };

  // --- 格式化周范围 ---
  const formatWeek = (ws, we) => {
    const startD = new Date(ws + 'T00:00:00+08:00');
    const endD = new Date(we + 'T00:00:00+08:00');
    return `${startD.getMonth() + 1}月${startD.getDate()}日 - ${endD.getMonth() + 1}月${endD.getDate()}日`;
  };

  res.json({
    reportId: `rpt_${Date.now()}`,
    weekRange: formatWeek(ws, we),
    summary: {
      level: overallLevel,
      title: levelTitles[overallLevel].title,
      oneLiner: levelTitles[overallLevel].oneLiner
    },
    parentA: {
      label: '妈',
      medAdherence: parentAMed,
      steps: parentASteps,
      heartRate: { anomalies: 0 }
    },
    parentB: {
      label: '爸',
      steps: parentBSteps,
      heartRate: { anomalies: 0 }
    },
    action: {
      text: overallLevel === 'green'
        ? '本周无需特意打电话谈正事。'
        : overallLevel === 'yellow'
          ? '建议这周打个电话问候一下。'
          : '请尽快联系爸妈，了解具体情况。'
    },
    youMayWonder: []
  });
});

module.exports = router;
