// pages/parent/home/index.js — 父母端首页：今日确认
const app = getApp();

Page({
  data: {
    today: '',
    nickname: '',
    inviteCode: '',
    // 今日确认项
    items: [
      { id: 'med_am', label: '早上吃药了吗？', icon: '💊', status: null },
      { id: 'meal', label: '今天好好吃饭了吗？', icon: '🍚', status: null },
      { id: 'walk', label: '今天出门走走了吗？', icon: '🚶', status: null }
    ],
    // 子女回声
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
      today: `${d.getMonth()+1}月${d.getDate()}日 ${days[d.getDay()]}`
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
    // 从 profile 接口刷新
    wx.request({
      url: `${app.globalData.API_BASE_URL}/api/auth/profile`,
      header: { 'Authorization': `Bearer ${app.globalData.token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          this.setData({
            nickname: res.data.nickname || this.data.nickname,
            inviteCode: res.data.invite_code || this.data.inviteCode
          });
        }
      }
    });
  },

  _loadTodayStatus() {
    // 从本地缓存读今日已确认状态
    const today = new Date().toISOString().slice(0, 10);
    const key = `pwb_confirm_${today}`;
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
    wx.request({
      url: `${app.globalData.API_BASE_URL}/api/feedback/latest`,
      data: { parent_id: user.id },
      success: (res) => {
        if (res.statusCode === 200 && res.data.has_feedback) {
          this.setData({ echoText: res.data.text });
        }
      }
    });
  },

  onConfirm(e) {
    const { id, status } = e.currentTarget.dataset;
    if (this.data.allDone) return;

    // 更新本地状态
    const items = this.data.items.map(item =>
      item.id === id ? { ...item, status } : item
    );
    const allDone = items.every(i => i.status !== null);

    // 存到本地缓存
    const today = new Date().toISOString().slice(0, 10);
    const key = `pwb_confirm_${today}`;
    const saved = wx.getStorageSync(key) || {};
    saved[id] = status;
    wx.setStorageSync(key, saved);

    this.setData({ items, allDone });

    // 提交到后端
    const user = wx.getStorageSync('pwb_user');
    if (user) {
      wx.request({
        url: `${app.globalData.API_BASE_URL}/api/med/confirm`,
        method: 'POST',
        data: {
          plan_id: id,
          parent_id: user.id,
          role: 'parent',
          status: status === 'done' ? 'taken' : 'skipped'
        }
      });
    }

    // 反馈
    if (allDone) {
      wx.vibrateShort && wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '今天辛苦了！', icon: 'success', duration: 2000 });
    } else {
      wx.vibrateShort && wx.vibrateShort({ type: 'light' });
    }
  },

  onReset() {
    // 开发用：清除今日确认
    const today = new Date().toISOString().slice(0, 10);
    wx.removeStorageSync(`pwb_confirm_${today}`);
    const items = this.data.items.map(item => ({ ...item, status: null }));
    this.setData({ items, allDone: false });
    wx.showToast({ title: '已重置', icon: 'none' });
  },

  // 复制邀请码
  onCopyCode() {
    if (!this.data.inviteCode) return;
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '邀请码已复制', icon: 'success' });
      }
    });
  }
});
