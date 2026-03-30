// pages/child/history-compare/index.js — 多周趋势对比 P2-4
const app = getApp();

Page({
  data: {
    weeks: 4,
    trends: []
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) return;

    try {
      const res = await app.api.getCompare(user.id, 4);
      this.setData({
        weeks: res.weeks,
        trends: res.trends
      });
    } catch (e) {
      console.error('加载趋势失败:', e);
    }
  },

  onGoChart() {
    wx.navigateBack();
  }
});
