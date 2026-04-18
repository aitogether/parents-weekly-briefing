const express = require('express');
const { getDB } = require('../db/encryption-enabled');
const { authMiddleware, checkOwnership } = require('../middleware/auth');

const router = express.Router();

/**

/**
 * POST /report/generate
 * 
 * 增强版周报生成（P1-1 + P1-2）
 * 
 * 灯号规则：
 *   步数日均 < 500 → red，< 1500 → yellow
 *   用药完成率 < 60% → red，< 80% → yellow
 *   连续3天零步数 → 红灯直接触发
 *   最终灯号取最差等级
 */
router.post('/generate', authMiddleware, (req, res) => {
  const { parent_a_id, parent_b_id } = req.body;
  if (!parent_a_id || !parent_b_id) {
    return res.status(400).json({ error: 'parent_a_id and parent_b_id required' });
  }

  const db = getDB();
  const parentA = db.getUserById(parent_a_id);
  const parentB = db.getUserById(parent_b_id);

  // ── 步数分析（含趋势） ──
  function analyzeSteps(parentId) {
    const rows = db.getWerunData(parentId, 7);
    if (!rows.length) return { dailyAvg: 0, trend: 'stable', trendPct: 0, note: '本周暂无数据', daily: [], consecutiveZero: 0 };

    const daily = rows.map(r => r.steps);
    const total = daily.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / daily.length);

    // 趋势：前半 vs 后半
    const mid = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, mid).reduce((a, b) => a + b, 0) / (mid || 1);
    const secondHalf = daily.slice(mid).reduce((a, b) => a + b, 0) / (daily.length - mid || 1);
    let trend = 'stable';
    let trendPct = 0;
    if (firstHalf > 0) {
      trendPct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
      if (trendPct > 15) trend = 'rising';
      else if (trendPct < -15) trend = 'falling';
    }

    // 连续零步数天数
    let consecutiveZero = 0;
    let maxConsecutiveZero = 0;
    for (const d of daily) {
      if (d < 100) { consecutiveZero++; maxConsecutiveZero = Math.max(maxConsecutiveZero, consecutiveZero); }
      else consecutiveZero = 0;
    }

    // 最高/最低天
    const maxSteps = Math.max(...daily);
    const minSteps = Math.min(...daily);

    return {
      dailyAvg: avg,
      trend,
      trendPct,
      note: `${rows.length}天数据`,
      daily: rows.map(r => ({ date: r.data_date, steps: r.steps })),
      consecutiveZero: maxConsecutiveZero,
      maxSteps,
      minSteps
    };
  }

  // ── 用药分析 ──
  function analyzeMed(parentId) {
    // 先看每日确认
    const dailyConfirms = db.getDailyConfirms(parentId, 7);
    // 再看每周确认
    const weeklyConfirms = db.getMedConfirmations(parentId, 7);

    const takenDays = new Set(dailyConfirms.filter(r => r.med_taken).map(r => r.date)).size;
    const confirmedDays = dailyConfirms.length;
    const expected = 7;
    const rate = confirmedDays > 0 ? Math.round((takenDays / expected) * 100) : 0;

    let trend = 'stable';
    if (rate >= 90) trend = 'up';
    else if (rate < 60) trend = 'down';

    return {
      rate,
      trend,
      note: confirmedDays === 0 ? '本周无确认记录' : `${takenDays}/${expected} 天确认用药`,
      confirmedDays,
      takenDays
    };
  }

  // ── 灯号 ──
  function stepsLevel(avg, consecutiveZero) {
    if (consecutiveZero >= 3) return 'red';
    return avg < 500 ? 'red' : avg < 1500 ? 'yellow' : 'green';
  }
  function medLevel(rate) { return rate < 60 ? 'red' : rate < 80 ? 'yellow' : 'green'; }
  function worstLevel(levels) {
    if (levels.includes('red')) return 'red';
    if (levels.includes('yellow')) return 'yellow';
    return 'green';
  }

  // ── 执行分析 ──
  const pASteps = analyzeSteps(parent_a_id);
  const pAMed = analyzeMed(parent_a_id);
  const pBSteps = analyzeSteps(parent_b_id);
  const pBMed = analyzeMed(parent_b_id);

  const pALevel = worstLevel([stepsLevel(pASteps.dailyAvg, pASteps.consecutiveZero), medLevel(pAMed.rate)]);
  const pBLevel = worstLevel([stepsLevel(pBSteps.dailyAvg, pBSteps.consecutiveZero), medLevel(pBMed.rate)]);
  const overall = worstLevel([pALevel, pBLevel]);

  // ── 话题参考（P1-2）──
  const topicsA = generateTopics({
    stepsData: pASteps.daily,
    medData: pAMed,
    parentName: parentA?.nickname || '妈',
    parentGender: 'mother'
  });
  const topicsB = generateTopics({
    stepsData: pBSteps.daily,
    medData: pBMed,
    parentName: parentB?.nickname || '爸',
    parentGender: 'father'
  });

  // ── 行动建议（增强版） ──
  const actions = [];
  if (pAMed.rate < 80) actions.push('问问妈用药情况，是不是药吃完了或忘记买了');
  if (pBMed.rate < 80) actions.push('提醒爸注意按时吃药');
  if (pASteps.consecutiveZero >= 3) actions.push('妈连续几天没怎么动，打个电话问问身体');
  if (pBSteps.consecutiveZero >= 3) actions.push('爸连续几天没出门，关心一下在家做什么');
  if (pASteps.trend === 'falling') actions.push('妈活动量在下降，看看是不是天气变冷不想出门');
  if (pBSteps.trend === 'falling') actions.push('爸越走越少，提醒他多活动');
  if (overall === 'green') actions.push('爸妈都挺好，打个电话聊聊天就好');

  const actionText = actions.length > 0 ? actions[0] : '本周无需特意谈正事，日常关心就好。';

  // ── 周报标题 ──
  const titles = {
    green: {
      title: '一切安好',
      oneLiner: '爸妈这周都挺好，放心忙你的。'
    },
    yellow: {
      title: '稍加留意',
      oneLiner: '有些数据不太理想，建议找个时间和爸妈聊聊。'
    },
    red: {
      title: '需要关注',
      oneLiner: '本周有红灯指标，尽快联系爸妈。'
    }
  };

  // ── 周期 ──
  const now = new Date();
  const ws = new Date(now); ws.setDate(ws.getDate() - 7);
  const fmt = d => `${d.getMonth() + 1}月${d.getDate()}日`;

  res.json({
    reportId: `rpt_${Date.now()}`,
    weekRange: `${fmt(ws)} - ${fmt(now)}`,
    generatedAt: now.toISOString(),
    summary: { level: overall, ...titles[overall] },
    parentA: {
      label: parentA?.nickname || '妈',
      level: pALevel,
      medAdherence: pAMed,
      steps: {
        dailyAvg: pASteps.dailyAvg,
        trend: pASteps.trend,
        trendPct: pASteps.trendPct,
        daily: pASteps.daily,
        maxSteps: pASteps.maxSteps,
        minSteps: pASteps.minSteps
      },
      heartRate: { anomalies: 0 }
    },
    parentB: {
      label: parentB?.nickname || '爸',
      level: pBLevel,
      medAdherence: pBMed,
      steps: {
        dailyAvg: pBSteps.dailyAvg,
        trend: pBSteps.trend,
        trendPct: pBSteps.trendPct,
        daily: pBSteps.daily,
        maxSteps: pBSteps.maxSteps,
        minSteps: pBSteps.minSteps
      },
      heartRate: { anomalies: 0 }
    },
    action: { text: actionText, allActions: actions },
    topics: {
      parentA: topicsA,
      parentB: topicsB,
      combined: [...topicsA, ...topicsB].slice(0, 5)
    },
    youMayWonder: _buildWonderList(pASteps, pAMed, pBSteps, pBMed)
  });
});

/**
 * 「你可能好奇」 — 从数据中推导子女可能想知道的问题
 */
function _buildWonderList(pASteps, pAMed, pBSteps, pBMed) {
  const wonder = [];
  if (pASteps.consecutiveZero >= 2) wonder.push('妈连续几天没走动——在家做什么？');
  if (pBSteps.consecutiveZero >= 2) wonder.push('爸是不是一直待在家里？');
  if (pAMed.rate < 80 && pAMed.rate > 0) wonder.push('妈漏了几天药——她还记得什么时候吃吗？');
  if (pBMed.rate < 80 && pBMed.rate > 0) wonder.push('爸的药快吃完了吗？');
  if (pASteps.trend === 'rising') wonder.push('妈最近越走越多——是不是有好事？');
  if (pBSteps.trend === 'rising') wonder.push('爸最近活动量上来了——什么情况？');
  return wonder.slice(0, 3);
}

module.exports = router;
