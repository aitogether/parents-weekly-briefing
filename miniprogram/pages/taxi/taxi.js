// pages/taxi/taxi.js
const utils = require('./taxi-utils');

Page({
  data: {
    requests: [],
    loading: true,
    submitting: false,
    todayRequests: 0,
    pendingRequests: 0,
    completedRequests: 0
  },

  onLoad() {
    this.loadRequests();
    this.calculateStats();
  },

  getStatusText(status) {
    return utils.getStatusText(status);
  },

  formatTime(timeStr) {
    return utils.formatTime(timeStr);
  },

  loadRequests() {
    const app = getApp();
    app.api.getTaxiRequests().then(res => {
      if (res && res.success) {
        const requests = res.requests || [];
        this.setData({ 
          requests,
          loading: false 
        });
        this.calculateStats();
      }
    }).catch(err => {
      console.error('加载叫车记录错误:', err);
      this.setData({ loading: false });
    });
  },

  calculateStats() {
    const { requests } = this.data;
    
    const todayRequests = requests.filter(r => 
      r.scheduled_time && 
      new Date(r.scheduled_time).toDateString() === new Date().toDateString()
    ).length;
    
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    
    this.setData({
      todayRequests,
      pendingRequests,
      completedRequests
    });
  },

  submitRequest(e) {
    wx.navigateTo({
      url: '/pages/taxi/submit'
    });
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/taxi/detail?id=${id}`
    });
  },

  cancelRequest(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个叫车请求吗？',
      success: (res) => {
        if (res.confirm) {
          this.doCancelRequest(id);
        }
      }
    });
  },

  async doCancelRequest(requestId) {
    try {
      const res = await getApp().api.cancelTaxiRequest(requestId);
      
      if (res && res.success) {
        wx.showToast({
          title: '已取消',
          icon: 'success'
        });
        this.loadRequests();
      } else {
        wx.showToast({
          title: res?.message || '取消失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('取消叫车错误:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },

  refreshList() {
    this.setData({ loading: true });
    this.loadRequests();
  },

  // 快速操作：重新叫车
  reorderRequest(e) {
    const { id, destination } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/taxi/submit?destination=${encodeURIComponent(destination)}&reorder=true`
    });
  },

  // 查看司机信息（模拟）
  viewDriverInfo(e) {
    const { requestId } = e.currentTarget.dataset;
    wx.showModal({
      title: '司机信息',
      content: '车牌号：京A12345\n司机：张师傅\n电话：138****5678\n预计到达：15分钟',
      showCancel: false
    });
  }
});