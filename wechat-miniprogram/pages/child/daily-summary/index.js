const api = require('../../../utils/api.js');

Page({
  data: {
    summaries: [],
    loading: true
  },

  onLoad() {
    this.loadSummaries();
  },

  onPullDownRefresh() {
    this.loadSummaries().then(() => wx.stopPullDownRefresh());
  },

  async loadSummaries() {
    this.setData({ loading: true });
    try {
      // 加载最近 7 天的每日小结
      const promises = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const date = d.toISOString().slice(0, 10);
        promises.push(api.getDailySummary(date).catch(() => null));
      }
      const results = await Promise.all(promises);
      const summaries = results
        .filter(r => r)
        .map(r => r.data || r);
      this.setData({ summaries, loading: false });
    } catch (err) {
      console.error('加载每日小结失败', err);
      this.setData({ loading: false });
      // mock 数据
      this.setData({
        summaries: [
          { date: '03-22 (六)', status: 'green', text: '今天爸妈状态不错，按时吃药了' },
          { date: '03-21 (五)', status: 'green', text: '爸爸散步了 40 分钟，妈妈血压正常' },
          { date: '03-20 (四)', status: 'yellow', text: '妈妈昨晚睡得不太好，注意休息' },
          { date: '03-19 (三)', status: 'green', text: '一切正常' },
          { date: '03-18 (二)', status: 'green', text: '爸妈今天一起去了公园' },
          { date: '03-17 (一)', status: 'green', text: '新的一周开始，状态良好' },
          { date: '03-16 (日)', status: 'green', text: '周末愉快，一切安好' }
        ]
      });
    }
  }
});
