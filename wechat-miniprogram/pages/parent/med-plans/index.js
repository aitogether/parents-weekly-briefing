const api = require('../../../utils/api.js');

Page({
  data: {
    plans: [],
    loading: true
  },

  onLoad() {
    this.loadPlans();
  },

  onPullDownRefresh() {
    this.loadPlans().then(() => wx.stopPullDownRefresh());
  },

  async loadPlans() {
    this.setData({ loading: true });
    try {
      const res = await api.getMedPlans();
      const plans = res.data || res;
      this.setData({ plans, loading: false });
    } catch (err) {
      console.error('加载用药计划失败', err);
      this.setData({ loading: false });
      // mock
      this.setData({
        plans: [
          {
            id: 'p1',
            medName: '降压药（氨氯地平）',
            dosage: '1片 (5mg)',
            scheduledTime: '每天 08:00',
            frequency: '每天',
            remark: '饭后服用，多喝水',
            status: 'confirmed'
          },
          {
            id: 'p2',
            medName: '钙片',
            dosage: '1片',
            scheduledTime: '每天 20:00',
            frequency: '每天',
            remark: '',
            status: 'pending'
          },
          {
            id: 'p3',
            medName: '维生素D',
            dosage: '1粒',
            scheduledTime: '每天 08:00',
            frequency: '每天',
            remark: '和降压药一起吃',
            status: 'confirmed'
          }
        ]
      });
    }
  }
});
