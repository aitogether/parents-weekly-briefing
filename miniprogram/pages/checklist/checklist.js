Page({
  data: { weekStart: '', items: [], completedCount: 0, totalCount: 8, percent: 0 },
  onLoad() { this.load(); },
  onShow() { this.load(); },
  load() {
    wx.request({
      url: getApp().globalData.apiBase + '/api/checklist/weekly',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync('token') },
      success: (res) => { if(res.data.success){ const items = res.data.data.items; this.setData({ items, completedCount: res.data.data.completed_count, totalCount: res.data.data.total_count, percent: Math.round(res.data.data.completed_count / res.data.data.total_count * 100) }); } },
      fail: () => { wx.showToast({title:'加载失败',icon:'none'}); }
    });
  },
  toggle(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ items: this.data.items.map(i => i.id === id ? { ...i, completed: !i.completed } : i) });
    this.setData({ completedCount: this.data.items.filter(i => i.completed).length, percent: Math.round(this.data.items.filter(i => i.completed).length / this.data.items.length * 100) });
  },
  save() {
    wx.showLoading({title:'保存...'});
    const promises = this.data.items.map(i => new Promise(res => {
      wx.request({ url: getApp().globalData.apiBase + '/api/checklist/complete/' + i.id, method: 'POST', header: { 'Authorization': 'Bearer ' + wx.getStorageSync('token'), 'Content-Type': 'application/json' }, data: { notes: i.notes||'' }, success: ()=>res(), fail: ()=>res() });
    }));
    Promise.all(promises).then(()=>{
      wx.hideLoading(); wx.showToast({title:'已保存',icon:'success'});
      this.load();
    });
  },
  history() {
    wx.request({
      url: getApp().globalData.apiBase + '/api/checklist/history',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync('token') },
      success: (res) => { if(res.data.success){ wx.showToast({title:'历史功能开发中',icon:'none'}); } }
    });
  }
});