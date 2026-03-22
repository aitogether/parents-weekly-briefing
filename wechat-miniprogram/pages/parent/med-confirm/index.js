const api = require('../../../utils/api');

Page({
  data: {
    today: '',
    plans: [],
    echoText: null
  },

  onLoad() {
    const d = new Date();
    const days = ['周日','周一','周二','周三','周四','周五','周六'];
    this.setData({
      today: `${d.getMonth()+1}月${d.getDate()}日 ${days[d.getDay()]}`
    });
    this.loadPlans();
    this.loadEcho();
  },

  async loadPlans() {
    try {
      const plans = await api.getMedPlans('mom_001');
      const today = new Date().toISOString().slice(0, 10);
      const confirmations = await api.getMedStats('mom_001', 1);
      // 简单逻辑：标记今天已确认的
      const enriched = plans.map(p => ({
        ...p,
        confirmed: false,
        status: null
      }));
      this.setData({ plans: enriched });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async loadEcho() {
    try {
      const res = await api.getLatestFeedback('mom_001');
      if (res.has_feedback) {
        this.setData({ echoText: res.text });
      }
    } catch (e) {
      // 无反馈时不显示
    }
  },

  async onConfirm(e) {
    const { id, status } = e.currentTarget.dataset;
    try {
      await api.confirmMedication(id, 'mom_001', 'parent', status);
      wx.showToast({
        title: status === 'taken' ? '✅ 已确认' : '已跳过',
        icon: 'success'
      });
      // 更新本地状态
      const plans = this.data.plans.map(p => {
        if (p.id === id) return { ...p, confirmed: true, status };
        return p;
      });
      this.setData({ plans });
    } catch (e) {
      wx.showToast({ title: '确认失败', icon: 'none' });
    }
  }
});
