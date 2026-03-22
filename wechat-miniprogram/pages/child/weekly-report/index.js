const api = require('../../../utils/api.js');

const STATUS_COLORS = {
  green: '#4CAF50',
  yellow: '#FFC107',
  red: '#F44336'
};

Page({
  data: {
    report: null,
    loading: true,
    feedbackDone: false,
    statusColor: STATUS_COLORS.green
  },

  onLoad() {
    this.loadReport();
  },

  onPullDownRefresh() {
    this.loadReport().then(() => wx.stopPullDownRefresh());
  },

  /** 加载周报数据 */
  async loadReport() {
    this.setData({ loading: true });
    try {
      // 计算本周一的日期作为 weekStart
      const now = new Date();
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      const weekStart = monday.toISOString().slice(0, 10);

      const res = await api.getWeeklyReport(weekStart);
      const report = res.data || res;
      this.setData({
        report,
        loading: false,
        statusColor: STATUS_COLORS[report.overallStatus] || STATUS_COLORS.green,
        feedbackDone: !!report.feedbackStatus
      });
    } catch (err) {
      console.error('加载周报失败', err);
      this.setData({ loading: false });
      // 使用 mock 数据方便调试
      this.setData({
        report: {
          weekRange: '2026.03.16 - 2026.03.22',
          overallStatus: 'green',
          overallText: '爸妈这周整体不错，血压稳定，睡眠也比上周好',
          keyFacts: [
            { text: '爸爸本周血压平均 128/82，比上周下降 5mmHg', anchor: '数据来源：智能血压计' },
            { text: '妈妈睡眠时长平均 7.2 小时，连续 5 天达标', anchor: '数据来源：手环' },
            { text: '两位老人本周散步 4 次，每次 30 分钟以上', anchor: '数据来源：步数统计' }
          ],
          weekendActions: [
            '问问爸爸最近睡眠怎么样',
            '周末天气好，建议爸妈出去走走',
            '提醒妈妈下周体检预约'
          ],
          curiousItems: [
            '爸爸的降压药是否需要调整剂量？',
            '妈妈最近是否还在坚持做手指操？'
          ],
          feedbackStatus: null
        },
        loading: false,
        statusColor: STATUS_COLORS.green
      });
    }
  },

  /** 反馈：已经聊了 */
  onFeedbackTalked() {
    this._submitFeedback('talked');
  },

  /** 反馈：还没聊 */
  onFeedbackNotTalked() {
    this._submitFeedback('not_talked');
  },

  async _submitFeedback(status) {
    if (this.data.feedbackDone) return;
    try {
      await api.submitFeedback(this.data.report?.id, status);
      this.setData({ feedbackDone: true });
      wx.showToast({ title: '已提交', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  }
});
