// pages/child/weekly-report/index.js
const app = getApp();

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
    echoSubmitted: false,
    parentName: ''
  },

  onLoad() {
    this._loadUserInfo();
    this.loadReport();
    this.loadEchoOptions();
  },

  _loadUserInfo() {
    const user = wx.getStorageSync('pwb_user');
    if (user && user.parent) {
      this.setData({ parentName: user.parent.nickname });
    }
  },

  async loadReport() {
    try {
      const user = wx.getStorageSync('pwb_user');
      const parentId = user?.parent?.id || user?.bound_to;
      if (!parentId) {
        wx.redirectTo({ url: '/pages/child/bind/index' });
        return;
      }
      const res = await app.api.generateReport(parentId, parentId);
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
      const res = await app.api.getFeedbackOptions();
      // cloud 模式返回 { options: [...] }，REST 模式返回 [...]
      const options = res.options || res;
      this.setData({ echoOptions: options });
    } catch (e) {
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
      const user = wx.getStorageSync('pwb_user');
      const parentId = user?.parent?.id || user?.bound_to;
      await app.api.submitEchoFeedback(user?.id || 'child_001', parentId, this.data.selectedEcho);
      this.setData({ echoSubmitted: true });
      wx.showToast({ title: '已发送', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  onGreetParent() {
    wx.showActionSheet({
      itemList: ['📞 打个电话', '💬 发条微信', '✅ 发送"放心"回声'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '打电话给父母',
            content: '请退出小程序，在手机通讯录中拨打父母电话',
            showCancel: false
          });
        } else if (res.tapIndex === 1) {
          wx.setClipboardData({
            data: this.data.action?.text || '爸妈，最近怎么样？',
            success: () => wx.showToast({ title: '已复制，去微信粘贴', icon: 'success' })
          });
        } else {
          this.setData({ selectedEcho: 'reassured' });
          this.onEchoSubmit();
        }
      }
    });
  }
});
