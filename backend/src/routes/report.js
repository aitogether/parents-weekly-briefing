const express = require('express');
const { getDB } = require('../db/store');

const router = express.Router();

/**
 * POST /report/generate
 * 灯号规则：
 *   步数日均 < 500 → yellow，< 200 → red
 *   用药完成率 < 80% → yellow，< 60% → red
 *   最终灯号取最差等级
 */
router.post('/generate', (req, res) => {
  const { parent_a_id, parent_b_id } = req.body;
  if (!parent_a_id || !parent_b_id) {
    return res.status(400).json({ error: 'parent_a_id and parent_b_id required' });
  }

  const db = getDB();

  // 步数分析
  function analyzeSteps(parentId) {
    const rows = db.getWerunData(parentId, 7);
    if (!rows.length) return { dailyAvg: 0, trend: 'stable', note: '本周暂无数据' };
    const total = rows.reduce((s, r) => s + r.steps, 0);
    return { dailyAvg: Math.round(total / rows.length), trend: 'stable', note: `${rows.length}天数据` };
  }

  // 用药分析（按7天计算完成率）
  function analyzeMed(parentId) {
    const records = db.getMedConfirmations(parentId, 7);
    const taken = records.filter(r => r.status === 'taken').length;
    const expected = 7; // 每天应确认1次
    const rate = Math.round((taken / expected) * 100);
    const note = records.length === 0
      ? '本周无确认记录'
      : `${taken}/${expected} 天确认`;
    return { rate, trend: rate >= 80 ? 'up' : 'down', note };
  }

  // 灯号（步数：日均<1500 yellow，<500 red；用药：<80% yellow，<60% red）
  function stepsLevel(avg) { return avg < 500 ? 'red' : avg < 1500 ? 'yellow' : 'green'; }
  function medLevel(rate) { return rate < 60 ? 'red' : rate < 80 ? 'yellow' : 'green'; }
  function worstLevel(levels) {
    if (levels.includes('red')) return 'red';
    if (levels.includes('yellow')) return 'yellow';
    return 'green';
  }

  const pASteps = analyzeSteps(parent_a_id);
  const pAMed = analyzeMed(parent_a_id);
  const pBSteps = analyzeSteps(parent_b_id);
  const overall = worstLevel([stepsLevel(pASteps.dailyAvg), medLevel(pAMed.rate), stepsLevel(pBSteps.dailyAvg)]);

  // 行动建议和你可能好奇
  let actionText = '本周无需特意打电话谈正事。';
  let wonder = [];
  if (overall !== 'green') {
    if (pAMed.rate < 80) {
      actionText = '这周打个电话给妈，问问是不是降压药吃完了忘了买。';
      wonder.push('妈漏了几天药——她记得什么时候吃吗？');
    }
    if (pBSteps.dailyAvg < 1500) {
      actionText += overall !== 'green' && pAMed.rate < 80
        ? '顺便问爸最近怎么都没出门。'
        : '问问爸最近怎么都没出门。';
      wonder.push('爸连续多天没出门——他在家做什么？情绪还好吗？');
    }
    if (pASteps.dailyAvg < 2000) {
      wonder.push('妈这周活动量偏低——身体有没有不舒服？');
    }
  }
  const titles = {
    green: { title: '本周不用操心', oneLiner: '爸妈这周都挺好，你可以放心忙自己的事。' },
    yellow: { title: '稍微留意一下', oneLiner: '有些数据不太理想，建议打个电话聊聊。' },
    red: { title: '需要关注', oneLiner: '本周有红灯指标，请尽快联系爸妈。' }
  };

  const now = new Date();
  const ws = new Date(now); ws.setDate(ws.getDate() - 7);
  const fmt = d => `${d.getMonth()+1}月${d.getDate()}日`;

  res.json({
    reportId: `rpt_${Date.now()}`,
    weekRange: `${fmt(ws)} - ${fmt(now)}`,
    summary: { level: overall, ...titles[overall] },
    parentA: { label: '妈', medAdherence: pAMed, steps: pASteps, heartRate: { anomalies: 0 } },
    parentB: { label: '爸', steps: pBSteps, heartRate: { anomalies: 0 } },
    action: { text: actionText },
    youMayWonder: wonder
  });
});

module.exports = router;
