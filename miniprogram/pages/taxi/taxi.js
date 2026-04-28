// pages/taxi/taxi.js
const utils = require('./taxi-utils');

Page({
  data: {
    requests: [],
    loading: true,
    submitting: false
  },

  onLoad() {
    this.loadRequests();
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
        this.setData({ 
          requests: res.requests || [],
          loading: false 
        });
      }
    }).catch(err => {
      console.error('加载叫车记录错误:', err);
      this.setData({ loading: false });
    });
  },

  submitRequest(e) {
    wx.navigateTo({
      url: '/pages/taxi/submit'
    });
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    // TODO: 跳转到详情页或显示详情弹窗
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  refreshList() {
    this.setData({ loading: true });
    this.loadRequests();
  }
});