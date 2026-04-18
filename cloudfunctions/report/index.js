const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const { STEPS_YELLOW, STEPS_RED, MED_YELLOW, MED_RED } = require('../common/constants');
const R = require('../common/response');

function getWeekRange(weekIndex) {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - weekIndex * 7);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  const fmt = d => `${d.getMonth() + 1}月${d.getDate()}日`;
  return {
    weekRange: `${fmt(weekStart)} - ${fmt(weekEnd)}`,
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10)
  };
}

function analyzeSteps(rows) {
  if (!rows.length) return { dailyAvg: 0, trend: 'stable', note: '本周暂无数据', daily: [], consecutiveZero: 0 };
  const daily = rows.map(r => r.steps);
  const total = daily.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / daily.length);

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

  let consecutiveZero = 0;
  let maxConsecutiveZero = 0;
  for (const d of daily) {
    if (d < 100) { consecutiveZero++; maxConsecutiveZero = Math.max(maxConsecutiveZero, consecutiveZero); }
    else consecutiveZero = 0;
  }

  return {
    dailyAvg: avg,
    trend,
    trendPct,
    note: `${rows.length}天数据`,
    daily: rows.map(r => ({ date: r.data_date, steps: r.steps })),
    consecutiveZero: maxConsecutiveZero
  };
}

function analyzeMed(records) {
  const taken = records.filter(r => r.status === 'taken').length;
  const expected = 7;
  const rate = Math.round((taken / expected) * 100);
  let trend = 'stable';
  if (rate >= 90) trend = 'up';
  else if (rate < 60) trend = 'down';
  return {
    rate,
    trend,
    note: records.length === 0 ? '本周无确认记录' : `${taken}/${expected} 天确认用药`,
    takenDays: taken
  };
}

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

exports.main = async (event, context) => {
  const db = getDB(cloud);
  const { action, child_id, weeks, parent_a_id, parent_b_id } = event;

  // ========== 生成周报（原功能） ==========
  if (action === 'generate') {
    if (!parent_a_id || !parent_b_id) return R.fail('parent_a_id and parent_b_id required');

    const [pAStepsRows, pAMedRecords, pBStepsRows] = await Promise.all([
      db.getWerunData(parent_a_id, 7),
      db.getMedConfirmations(parent_a_id, 7),
      db.getWerunData(parent_b_id, 7)
    ]);

    const pASteps = analyzeSteps(pAStepsRows);
    const pAMed = analyzeMed(pAMedRecords);
    const pBSteps = analyzeSteps(pBStepsRows);
    const overall = worstLevel([stepsLevel(pASteps.dailyAvg, pASteps.consecutiveZero), medLevel(pAMed.rate), stepsLevel(pBSteps.dailyAvg, pBSteps.consecutiveZero)]);

    let actionText = '本周无需特意打电话谈正事。';
    if (overall !== 'green') {
      if (pAMed.rate < MED_YELLOW) actionText = '这周打个电话给妈，问问是不是降压药吃完了忘了买。';
      else if (pBSteps.dailyAvg < STEPS_YELLOW) actionText = '问问爸最近怎么都没出门。';
    }

    const titles = {
      green: { title: '本周不用操心', oneLiner: '爸妈这周都挺好，你可以放心忙自己的事。' },
      yellow: { title: '稍微留意一下', oneLiner: '有些数据不太理想，建议打个电话聊聊。' },
      red: { title: '需要关注', oneLiner: '本周有红灯指标，请尽快联系爸妈。' }
    };

    const now = new Date();
    const ws = new Date(now); ws.setDate(ws.getDate() - 7);
    const fmt = d => `${d.getMonth() + 1}月${d.getDate()}日`;

    return R.ok({
      reportId: 'rpt_' + Date.now(),
      weekRange: `${fmt(ws)} - ${fmt(now)}`,
      summary: { level: overall, ...titles[overall] },
      parentA: { label: '妈', medAdherence: pAMed, steps: pASteps, heartRate: { anomalies: 0 } },
      parentB: { label: '爸', steps: pBSteps, heartRate: { anomalies: 0 } },
      action: { text: actionText }
    });
  }

  // ========== 历史周报列表 ==========
  if (action === 'history') {
    if (!child_id) return R.fail('child_id required');
    const weeksVal = parseInt(weeks) || 4;
    const maxWeeks = Math.min(weeksVal, 12);

    const child = await db.getUserById(child_id);
    if (!child || child.role !== 'child') return R.fail('invalid child_id');

    const parentIds = Array.isArray(child.bound_to) ? child.bound_to : (child.bound_to ? [child.bound_to] : []);
    if (parentIds.length === 0) return R.ok({ weeks: [] });

    const history = [];
    for (let w = 0; w < maxWeeks; w++) {
      const { weekStart, weekEnd } = getWeekRange(w);
      const weekData = {
        weekRange: `${weekStart} - ${weekEnd}`,
        weekStart,
        weekEnd,
        parents: []
      };

      for (const pid of parentIds) {
        const parent = await db.getUserById(pid);
        if (!parent) continue;

        const steps = db.getWerunData(pid, 7);
        const weekSteps = steps.filter(s => s.data_date >= weekStart && s.data_date <= weekEnd);
        const medConfirms = db.getMedConfirmations(pid, 7);
        const weekMeds = medConfirms.filter(m => m.confirmed_date >= weekStart && m.confirmed_date <= weekEnd);

        const avgSteps = weekSteps.length > 0
          ? Math.round(weekSteps.reduce((s, r) => s + r.steps, 0) / weekSteps.length)
          : 0;
        const takenDays = weekMeds.filter(m => m.status === 'taken').length;
        const medRate = weekMeds.length > 0 ? Math.round((takenDays / 7) * 100) : 0;

        let level = 'green';
        if (avgSteps < 500 || medRate < 60) level = 'red';
        else if (avgSteps < 1500 || medRate < 80) level = 'yellow';

        weekData.parents.push({
          id: pid,
          label: parent.nickname || '爸妈',
          level,
          avgSteps,
          medRate,
          dataDays: weekSteps.length
        });
      }

      const allLevels = weekData.parents.map(p => p.level);
      weekData.level = allLevels.includes('red') ? 'red' : allLevels.includes('yellow') ? 'yellow' : 'green';
      history.push(weekData);
    }

    return R.ok({ child_id, totalWeeks: history.length, weeks: history });
  }

  // ========== 多周趋势对比 ==========
  if (action === 'compare') {
    if (!child_id) return R.fail('child_id required');
    const weeksVal = parseInt(weeks) || 4;
    const maxWeeks = Math.min(weeksVal, 12);

    const child = await db.getUserById(child_id);
    if (!child || child.role !== 'child') return R.fail('invalid child_id');

    const parentIds = Array.isArray(child.bound_to) ? child.bound_to : (child.bound_to ? [child.bound_to] : []);
    const trends = [];

    for (const pid of parentIds) {
      const parent = await db.getUserById(pid);
      if (!parent) continue;

      const weeklyTrend = [];
      for (let w = 0; w < maxWeeks; w++) {
        const { weekStart, weekEnd } = getWeekRange(w);
        const steps = db.getWerunData(pid, 30);
        const weekSteps = steps.filter(s => s.data_date >= weekStart && s.data_date <= weekEnd);
        const meds = db.getMedConfirmations(pid, 30);
        const weekMeds = meds.filter(m => m.confirmed_date >= weekStart && m.confirmed_date <= weekEnd);

        const avgSteps = weekSteps.length > 0
          ? Math.round(weekSteps.reduce((s, r) => s + r.steps, 0) / weekSteps.length)
          : 0;
        const takenDays = weekMeds.filter(m => m.status === 'taken').length;
        const medRate = weekMeds.length > 0 ? Math.round((takenDays / 7) * 100) : 0;

        let level = 'green';
        if (avgSteps < 500 || medRate < 60) level = 'red';
        else if (avgSteps < 1500 || medRate < 80) level = 'yellow';

        weeklyTrend.push({ weekIndex: w, weekLabel: w === 0 ? '本周' : `${w}周前`, avgSteps, medRate, level });
      }

      const stepsTrend = weeklyTrend.map(w => w.avgSteps);
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

      trends.push({
        id: pid,
        label: parent.nickname || '爸妈',
        weekly: weeklyTrend,
        overallStepsTrend,
        greenWeeks: levelTrend.filter(l => l === 'green').length,
        yellowWeeks: levelTrend.filter(l => l === 'yellow').length,
        redWeeks: levelTrend.filter(l => l === 'red').length
      });
    }

    return R.ok({ child_id, weeks: maxWeeks, trends });
  }

  return R.fail('unknown action: ' + action);
};
