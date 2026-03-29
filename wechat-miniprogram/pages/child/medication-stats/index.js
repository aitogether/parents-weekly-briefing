const api = require('../../../utils/api.js');

Page({
  data: {
    todayDone: 0,
    todayTotal: 0,
    todayRate: 0,
    weekDone: 0,
    weekTotal: 0,
    weekRate: 0,
    missedRecords: [],
    loading: true
  },

  onLoad() {
    this.loadStats();
  },

  onPullDownRefresh() {
    this.loadStats().then(() => wx.stopPullDownRefresh());
  },

  async loadStats() {
    this.setData({ loading: true });
    try {
      const res = await api.getMedStats('week');
      const stats = res.data || res;
      this.setData({
        todayDone: stats.today?.done || 0,
        todayTotal: stats.today?.total || 0,
        todayRate: stats.today?.rate || 0,
        weekDone: stats.week?.done || 0,
        weekTotal: stats.week?.total || 0,
        weekRate: stats.week?.rate || 0,
        missedRecords: stats.missed || [],
        loading: false
      });
    } catch (err) {
      console.error('加载用药统计失败', err);
      this.setData({ loading: false });
      // mock
      this.setData({
        todayDone: 3,
        todayTotal: 4,
        todayRate: 75,
        weekDone: 25,
        weekTotal: 28,
        weekRate: 89,
        missedRecords: [
          { medName: '降压药', dosage: '1片', scheduledTime: '03-21 08:00' },
          { medName: '钙片', dosage: '1片', scheduledTime: '03-19 20:00' },
          { medName: '降压药', dosage: '1片', scheduledTime: '03-17 08:00' }
        ]
      });
    }
  }
});
