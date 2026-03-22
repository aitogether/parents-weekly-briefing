const api = require('../../../utils/api.js');

Page({
  data: {
    currentMed: null,
    loading: true
  },

  onLoad(options) {
    // 支持从通知携带 recordId 参数
    this.recordId = options.recordId || null;
    this.loadCurrentMed();
  },

  onShow() {
    // 每次页面显示时刷新
    this.loadCurrentMed();
  },

  async loadCurrentMed() {
    this.setData({ loading: true });
    try {
      const res = await api.getMedPlans();
      const plans = res.data || res;
      // 取第一个待确认的用药记录
      const pending = plans.filter(p => p.status === 'pending');
      this.setData({
        currentMed: pending.length > 0 ? pending[0] : null,
        loading: false
      });
    } catch (err) {
      console.error('加载用药计划失败', err);
      this.setData({ loading: false });
      // mock
      this.setData({
        currentMed: {
          id: 'med_001',
          medName: '降压药（氨氯地平）',
          dosage: '1片 (5mg)',
          scheduledTime: '08:00',
          remark: '饭后服用，多喝水',
          status: 'pending'
        }
      });
    }
  },

  /** 已吃 */
  async onConfirmTaken() {
    await this._confirm('taken');
  },

  /** 这次先不吃 */
  async onConfirmSkipped() {
    wx.showModal({
      title: '确认跳过',
      content: '确定这次不吃吗？我们会在周报中记录。',
      success: async (res) => {
        if (res.confirm) {
          await this._confirm('skipped');
        }
      }
    });
  },

  async _confirm(status) {
    const med = this.data.currentMed;
    if (!med) return;
    wx.showLoading({ title: '提交中...' });
    try {
      await api.confirmMedication(med.id, status);
      wx.hideLoading();
      wx.showToast({
        title: status === 'taken' ? '已记录 ✅' : '已跳过',
        icon: 'success'
      });
      // 重新加载
      this.loadCurrentMed();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  }
});
