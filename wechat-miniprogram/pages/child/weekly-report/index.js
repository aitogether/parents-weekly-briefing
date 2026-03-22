const api = require('../../../utils/api');

Page({
  data: {
    weekRange: '',
    summary: {},
    parentA: {},
    parentB: {},
    action: {},
    youMayWonder: [],
    echoOptions: [],
    selectedEcho: null,
    echoSubmitted: false
  },

  onLoad() {
    this.loadReport();
    this.loadEchoOptions();
  },

  async loadReport() {
    try {
      const res = await api.generateReport('mom_001', 'dad_001');
      this.setData({
        weekRange: res.weekRange,
        summary: res.summary,
        parentA: res.parentA,
        parentB: res.parentB,
        action: res.action,
        youMayWonder: res.youMayWonder || []
      });
    } catch (e) {
      wx.showToast({ title: '加载周报失败', icon: 'none' });
    }
  },

  async loadEchoOptions() {
    try {
      const res = await api.getFeedbackOptions();
      this.setData({ echoOptions: res });
    } catch (e) {
      // fallback
      this.setData({
        echoOptions: [
          { type: 'reassured', text: '今天我看过你的情况，一切放心。' },
          { type: 'concerned', text: '最近有点担心，改天好好跟你聊聊。' },
          { type: 'busy_caring', text: '我这几天有点忙，但一直惦记着你。' }
        ]
      });
    }
  },

  onEchoSelect(e) {
    this.setData({ selectedEcho: e.currentTarget.dataset.type });
  },

  async onEchoSubmit() {
    if (!this.data.selectedEcho || this.data.echoSubmitted) return;
    try {
      await api.submitEchoFeedback('child_001', 'mom_001', this.data.selectedEcho);
      this.setData({ echoSubmitted: true });
      wx.showToast({ title: '已发送', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  }
});
