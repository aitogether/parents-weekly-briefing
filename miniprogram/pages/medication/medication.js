// pages/medication/medication.js
Page({
  data: {
    medPlans: [],
    loading: true,
    todayConfirms: []
  },

  onLoad() {
    this.loadMedPlans();
    this.loadTodayConfirms();
  },

  loadMedPlans() {
    const app = getApp();
    app.api.getMedPlans().then(res => {
      if (res && res.success) {
        this.setData({ medPlans: res.plans || [] });
      } else {
        wx.showToast({
          title: '加载用药计划失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('加载用药计划错误:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  loadTodayConfirms() {
    const app = getApp();
    app.api.getTodayMeds().then(res => {
      if (res && res.success) {
        this.setData({ todayConfirms: res.confirms || [] });
      }
    });
  },

  confirmMed(e) {
    const { planId } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认用药',
      content: '您已按时服药，确认记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.doConfirmMed(planId);
        }
      }
    });
  },

  async doConfirmMed(planId) {
    try {
      const res = await getApp().api.confirmMed(planId);
      
      if (res && res.success) {
        wx.showToast({
          title: '已确认',
          icon: 'success'
        });
        this.loadTodayConfirms();
      } else {
        wx.showToast({
          title: res?.message || '确认失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('确认用药错误:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },

  addDailyConfirm() {
    wx.cloud.callFunction({
      name: 'medication',
      data: { action: 'addQuickConfirm' }
    }).then(res => {
      if (res.result && res.result.success) {
        this.loadTodayConfirms();
        wx.showToast({
          title: '一键确认成功',
          icon: 'success'
        });
      }
    }).catch(err => {
      console.error('一键确认错误:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    });
  }
});