const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');

// 焦虑量表问题定义
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

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = getDB(cloud);
  const { action, child_id, answers } = event;

  switch (action) {
    case 'questions': {
      // 获取量表问题（无需登录）
      return R.ok({ questions: QUESTIONS });
    }

    case 'submit': {
      // 提交焦虑量表
      if (!child_id) return R.fail('child_id required');
      if (!answers || !Array.isArray(answers)) return R.fail('answers array required');

      // 验证答案
      for (const a of answers) {
        if (!a.question_id || a.score === undefined) {
          return R.fail('each answer needs question_id and score');
        }
        if (a.score < 1 || a.score > 10) {
          return R.fail('score must be 1-10');
        }
      }

      // 验证问题ID
      const validIds = QUESTIONS.map(q => q.id);
      for (const a of answers) {
        if (!validIds.includes(a.question_id)) {
          return R.fail('invalid question_id: ' + a.question_id);
        }
      }

      const record = await db.addAnxietySurvey({
        child_id,
        answers,
        submitted_at: new Date().toISOString()
      });

      const avgScore = Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length * 10) / 10;

      let message = '';
      if (avgScore <= 3) {
        message = '你对爸妈的状态很放心，继续保持关注就好。';
      } else if (avgScore <= 6) {
        message = '有些担心是正常的，建议多和爸妈聊聊。';
      } else {
        message = '你的担心比较多，建议尽快和爸妈沟通，或了解他们的近况。';
      }

      return R.ok({
        record_id: record._id || record.id,
        avg_score: avgScore,
        message
      });
    }

    case 'history': {
      // 获取历史记录
      if (!child_id) return R.fail('child_id required');
      const limitVal = event.limit || 10;
      const history = await db.getAnxietyHistory(child_id, limitVal);

      return R.ok({
        child_id,
        total: history.length,
        history: history.map(h => ({
          id: h._id || h.id,
          submitted_at: h.submitted_at,
          avg_score: Math.round(h.answers.reduce((s, a) => s + a.score, 0) / h.answers.length * 10) / 10,
          answers: h.answers
        }))
      });
    }

    default:
      return R.fail('unknown action: ' + action);
  }
};
