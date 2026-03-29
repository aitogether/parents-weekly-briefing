const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const { STEPS_YELLOW, STEPS_RED, MED_YELLOW, MED_RED } = require('../common/constants');
const R = require('../common/response');

exports.main = async (event, context) => {
  const db = getDB(cloud);
  const { action, parent_a_id, parent_b_id } = event;

  if (action !== 'generate') return R.fail('unknown action: ' + action);
  if (!parent_a_id || !parent_b_id) return R.fail('parent_a_id and parent_b_id required');

  function analyzeSteps(rows) {
    if (!rows.length) return { dailyAvg: 0, trend: 'stable', note: '本周暂无数据' };
    const total = rows.reduce((s, r) => s + r.steps, 0);
    return { dailyAvg: Math.round(total / rows.length), trend: 'stable', note: rows.length + '天数据' };
  }

  function analyzeMed(records) {
    const taken = records.filter(r => r.status === 'taken').length;
    const expected = 7;
    const rate = Math.round((taken / expected) * 100);
    return {
      rate, trend: rate >= MED_YELLOW ? 'up' : 'down',
      note: records.length === 0 ? '本周无确认记录' : taken + '/' + expected + ' 天确认'
    };
  }

  function stepsLevel(avg) { return avg < STEPS_RED ? 'red' : avg < STEPS_YELLOW ? 'yellow' : 'green'; }
  function medLevel(rate) { return rate < MED_RED ? 'red' : rate < MED_YELLOW ? 'yellow' : 'green'; }
  function worstLevel(levels) {
    if (levels.includes('red')) return 'red';
    if (levels.includes('yellow')) return 'yellow';
    return 'green';
  }

  const [pAStepsRows, pAMedRecords, pBStepsRows] = await Promise.all([
    db.getWerunData(parent_a_id, 7),
    db.getMedConfirmations(parent_a_id, 7),
    db.getWerunData(parent_b_id, 7)
  ]);

  const pASteps = analyzeSteps(pAStepsRows);
  const pAMed = analyzeMed(pAMedRecords);
  const pBSteps = analyzeSteps(pBStepsRows);
  const overall = worstLevel([stepsLevel(pASteps.dailyAvg), medLevel(pAMed.rate), stepsLevel(pBSteps.dailyAvg)]);

  let actionText = '本周无需特意打电话谈正事。';
  let wonder = [];
  if (overall !== 'green') {
    if (pAMed.rate < MED_YELLOW) {
      actionText = '这周打个电话给妈，问问是不是降压药吃完了忘了买。';
      wonder.push('妈漏了几天药——她记得什么时候吃吗？');
    }
    if (pBSteps.dailyAvg < STEPS_YELLOW) {
      actionText += pAMed.rate < MED_YELLOW ? '顺便问爸最近怎么都没出门。' : '问问爸最近怎么都没出门。';
      wonder.push('爸连续多天没出门——他在家做什么？情绪还好吗？');
    }
    if (pASteps.dailyAvg < 2000) wonder.push('妈这周活动量偏低——身体有没有不舒服？');
  }

  const titles = {
    green: { title: '本周不用操心', oneLiner: '爸妈这周都挺好，你可以放心忙自己的事。' },
    yellow: { title: '稍微留意一下', oneLiner: '有些数据不太理想，建议打个电话聊聊。' },
    red: { title: '需要关注', oneLiner: '本周有红灯指标，请尽快联系爸妈。' }
  };

  const now = new Date();
  const ws = new Date(now);
  ws.setDate(ws.getDate() - 7);
  const fmt = d => (d.getMonth() + 1) + '月' + d.getDate() + '日';

  return R.ok({
    reportId: 'rpt_' + Date.now(),
    weekRange: fmt(ws) + ' - ' + fmt(now),
    summary: { level: overall, ...titles[overall] },
    parentA: { label: '妈', medAdherence: pAMed, steps: pASteps, heartRate: { anomalies: 0 } },
    parentB: { label: '爸', steps: pBSteps, heartRate: { anomalies: 0 } },
    action: { text: actionText },
    youMayWonder: wonder
  });
};
