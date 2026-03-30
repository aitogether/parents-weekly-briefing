// pages/child/weekly-report/index.js — v0.2 首屏一句话化
const app = getApp();

Page({
  data: {
    // 首屏一句话
    oneLiner: '加载中…',
    quote: '',
    parentName: '',
    parentId: '',

    // 提醒状态
    showRemindToast: false,

    // 折叠详情
    showDetail: false,

    // 原有数据
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
    this._loadUserInfo();
    this.loadReport();
    this.loadEchoOptions();
  },

  _loadUserInfo() {
    const user = wx.getStorageSync('pwb_user');
    if (user && user.parent) {
      this.setData({
        parentName: user.parent.nickname,
        parentId: user.parent.id
      });
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

      // 构造一句话总结（≤25字）
      const oneLiner = this._buildOneLiner(res);

      // 随机金句
      const quote = this._pickQuote();

      this.setData({
        oneLiner,
        quote,
        weekRange: res.weekRange,
        summary: res.summary,
        parentA: res.parentA,
        parentB: res.parentB,
        action: res.action,
        youMayWonder: res.youMayWonder || []
      });
    } catch (e) {
      this.setData({ oneLiner: '本周周报加载中，请稍后查看' });
    }
  },

  _buildOneLiner(report) {
    const name = this.data.parentName || '爸妈';
    const avgSteps = report?.parentA?.steps?.dailyAvg || '—';
    const medRate = report?.parentA?.medAdherence?.rate;

    if (medRate !== undefined && medRate !== null) {
      if (medRate >= 100) {
        return `${name}这周走了${avgSteps}步/天，用药全勤 👍`;
      } else if (medRate >= 80) {
        return `${name}这周走了${avgSteps}步/天，用药完成${medRate}%`;
      } else {
        return `${name}这周走了${avgSteps}步/天，用药不太完整，可以关心一下`;
      }
    }
    return `${name}这周日均走了${avgSteps}步`;
  },

  _pickQuote() {
    const quotes = [
      '你惦记着他们，他们就知道了。',
      '远方的牵挂，他们收到了。',
      '你在忙，也没忘了他们。',
      '好好吃饭，好好走路，就是最好的事。',
      '有人惦记的日子，走路都有劲。',
      '你不常打电话，但你一直都在。',
      '走得慢也没关系，在走就好。',
      '你看见了，就是最好的关心。',
      '他们在好好生活，你可以放心。',
      '能惦记父母的孩子，本身就是福气。'
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  },

  toggleDetail() {
    this.setData({ showDetail: !this.data.showDetail });
  },

  // ——— 焦虑量表 ———
  onGoSurvey() {
    wx.navigateTo({ url: '/pages/child/anxiety-survey/index' });
  },

  // ——— 行动按钮 ———
  onCallParent() {
    wx.showActionSheet({
      itemList: ['📞 打电话', '💬 发微信消息'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '打电话给' + (this.data.parentName || '父母'),
            content: '请退出小程序，在手机通讯录中拨打父母电话',
            showCancel: false
          });
        } else {
          wx.setClipboardData({
            data: this.data.action?.text || (this.data.parentName || '爸妈') + '，最近怎么样？',
            success: () => wx.showToast({ title: '已复制，去微信粘贴', icon: 'success' })
          });
        }
      }
    });
  },

  async onRemindMed() {
    try {
      const parentId = this.data.parentId;
      if (!parentId) {
        wx.showToast({ title: '未绑定父母', icon: 'none' });
        return;
      }
      await app.api.sendReminder(parentId, '💊 您的孩子提醒您：按时吃药哦～');
      this.setData({ showRemindToast: true });
      setTimeout(() => this.setData({ showRemindToast: false }), 2000);
    } catch (e) {
      wx.showToast({ title: '提醒发送失败', icon: 'none' });
    }
  },

  // ——— 原有功能 ———
  async loadEchoOptions() {
    try {
      const res = await app.api.getFeedbackOptions();
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
  }
});
