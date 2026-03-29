// pages/parent/home/index.js — 父母端首页：今日确认
const app = getApp();

Page({
  data: {
    today: '',
    nickname: '',
    inviteCode: '',
    items: [
      { id: 'med_am', label: '早上吃药了吗？', icon: '💊', status: null },
      { id: 'meal', label: '今天好好吃饭了吗？', icon: '🍚', status: null },
      { id: 'walk', label: '今天出门走走了吗？', icon: '🚶', status: null }
    ],
    echoText: null,
    allDone: false
  },

  onLoad() {
    this._initDate();
    this._loadUserInfo();
    this._loadTodayStatus();
    this._loadEcho();
  },

  _initDate() {
    const d = new Date();
    const days = ['周日','周一','周二','周三','周四','周五','周六'];
    this.setData({
      today: (d.getMonth()+1) + '月' + d.getDate() + '日 ' + days[d.getDay()]
    });
  },

  _loadUserInfo() {
    const user = wx.getStorageSync('pwb_user');
    if (user) {
      this.setData({
        nickname: user.nickname || '爸爸/妈妈',
        inviteCode: user.invite_code || ''
      });
    }
    // 从接口刷新
    app.api.getProfile().then(res => {
      this.setData({
        nickname: res.nickname || this.data.nickname,
        inviteCode: res.invite_code || this.data.inviteCode
      });
    }).catch(() => {});
  },

  _loadTodayStatus() {
    const today = new Date().toISOString().slice(0, 10);
    const key = 'pwb_confirm_' + today;
    const saved = wx.getStorageSync(key) || {};
    const items = this.data.items.map(item => ({
      ...item,
      status: saved[item.id] || null
    }));
    const allDone = items.every(i => i.status !== null);
    this.setData({ items, allDone });
  },

  _loadEcho() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) return;
    app.api.getLatestFeedback(user.id).then(res => {
      if (res.has_feedback) {
        this.setData({ echoText: res.text });
      }
    }).catch(() => {});
  },

  onConfirm(e) {
    const { id, status } = e.currentTarget.dataset;
    if (this.data.allDone) return;

    const items = this.data.items.map(item =>
      item.id === id ? { ...item, status } : item
    );
    const allDone = items.every(i => i.status !== null);

    // 本地缓存
    const today = new Date().toISOString().slice(0, 10);
    const key = 'pwb_confirm_' + today;
    const saved = wx.getStorageSync(key) || {};
    saved[id] = status;
    wx.setStorageSync(key, saved);

    this.setData({ items, allDone });

    // 提交到后端/云函数
    const user = wx.getStorageSync('pwb_user');
    if (user) {
      app.api.confirmMedication(id, user.id, 'parent', status === 'done' ? 'taken' : 'skipped')
        .catch(() => {});
    }

    if (allDone) {
      wx.vibrateShort && wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '今天辛苦了！', icon: 'success', duration: 2000 });
    } else {
      wx.vibrateShort && wx.vibrateShort({ type: 'light' });
    }
  },

  onReset() {
    const today = new Date().toISOString().slice(0, 10);
    wx.removeStorageSync('pwb_confirm_' + today);
    const items = this.data.items.map(item => ({ ...item, status: null }));
    this.setData({ items, allDone: false });
    wx.showToast({ title: '已重置', icon: 'none' });
  },

  onCopyCode() {
    if (!this.data.inviteCode) return;
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' })
    });
  }
});
