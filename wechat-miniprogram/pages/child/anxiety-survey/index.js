// pages/child/anxiety-survey/index.js — 焦虑感自报量表 P1-7
const app = getApp();

Page({
  data: {
    questions: [
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
    ],
    scaleRange: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    answers: [0, 0, 0],
    allAnswered: false,
    submitted: false,
    avgScore: 0,
    resultMessage: ''
  },

  onScore(e) {
    const qi = e.currentTarget.dataset.qi;
    const score = e.currentTarget.dataset.score;
    const answers = [...this.data.answers];
    answers[qi] = score;
    const allAnswered = answers.every(a => a > 0);
    this.setData({ answers, allAnswered });
  },

  async onSubmit() {
    if (!this.data.allAnswered) return;

    const user = wx.getStorageSync('pwb_user');
    const answers = this.data.questions.map((q, i) => ({
      question_id: q.id,
      score: this.data.answers[i]
    }));

    try {
      const res = await app.api.submitAnxietySurvey(user?.id || 'child_001', answers);
      this.setData({
        submitted: true,
        avgScore: res.avg_score,
        resultMessage: res.message
      });
    } catch (e) {
      // 本地计算 fallback
      const avg = Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length * 10) / 10;
      const msg = avg <= 3
        ? '你对爸妈的状态很放心，继续保持关注就好。'
        : avg <= 6
          ? '有些担心是正常的，建议多和爸妈聊聊。'
          : '你的担心比较多，建议尽快和爸妈沟通。';
      this.setData({ submitted: true, avgScore: avg, resultMessage: msg });
    }
  },

  onDone() {
    wx.navigateBack();
  }
});
