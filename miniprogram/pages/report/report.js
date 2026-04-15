Page({
  data: { safetyCompleted: 0 },
  onLoad() { this.loadSafety(); },
  loadSafety() {
    wx.request({
      url: getApp().globalData.apiBase + '/api/checklist/weekly',
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync('token') },
      success: (res) => { if(res.data.success) this.setData({ safetyCompleted: res.data.data.completed_count }); }
    });
  },
  goChecklist() { wx.navigateTo({ url: '/pages/checklist/checklist' }); }
});