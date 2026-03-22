const api = require('../../../utils/api.js');

Page({
  data: {
    dailySummaryEnabled: true,
    weeklyReportEnabled: true
  },

  onLoad() {
    this.loadSettings();
  },

  async loadSettings() {
    try {
      const res = await api.getNotificationSettings();
      const settings = res.data || res;
      this.setData({
        dailySummaryEnabled: settings.dailySummary !== false,
        weeklyReportEnabled: settings.weeklyReport !== false
      });
    } catch (err) {
      // 使用默认值
    }
  },

  onToggleDailySummary(e) {
    const enabled = e.detail.value;
    this.setData({ dailySummaryEnabled: enabled });
    this._saveSettings();
  },

  onToggleWeeklyReport(e) {
    const enabled = e.detail.value;
    this.setData({ weeklyReportEnabled: enabled });
    this._saveSettings();
  },

  async _saveSettings() {
    try {
      await api.updateNotificationSettings({
        dailySummary: this.data.dailySummaryEnabled,
        weeklyReport: this.data.weeklyReportEnabled
      });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' });
  }
});
