// pages/parent/home/index.js — 父母端首页 v0.2（一键确认）
const app = getApp();

Page({
  data: {
    today: '',
    greetingText: '',
    nickname: '',
    inviteCode: '',
    showInviteCode: true, // 绑定后隐藏
    todaySteps: 0,
    confirmed: false,
    weekConfirmed: 0,
    weekMedProgress: 0, // 本周用药完成百分比
    nextReminder: '',
    echoText: null,
    showMedSheet: false
  },

  onLoad() {
    this._initDate();
    this._loadUserInfo();
    this._loadTodayStatus();
    this._loadSteps();
    this._loadEcho();
    this._loadWeekStats();
  },

  onShow() {
    // 每次回到页面刷新步数和确认状态
    this._loadTodayStatus();
    this._loadSteps();
    this._loadWeekStats();
  },

  _initDate() {
    const d = new Date();
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const hour = d.getHours();
    let greeting = '你好';
    if (hour < 6) greeting = '夜深了';
    else if (hour < 11) greeting = '早上好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    else greeting = '晚上好';

    this.setData({
      today: (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + days[d.getDay()],
      greetingText: greeting
    });
  },

  _loadUserInfo() {
    const user = wx.getStorageSync('pwb_user');
    if (user) {
      this.setData({
        nickname: user.nickname || '爸爸/妈妈',
        inviteCode: user.invite_code || '',
        showInviteCode: !user.bound_to // 已绑定则隐藏邀请码
      });
    }
    // 从接口刷新
    app.api.getProfile().then(res => {
      this.setData({
        nickname: res.nickname || this.data.nickname,
        inviteCode: res.invite_code || this.data.inviteCode,
        showInviteCode: !res.bound_to
      });
    }).catch(() => {});
  },

  _loadTodayStatus() {
    const today = new Date().toISOString().slice(0, 10);
    const key = 'pwb_confirmed_' + today;
    const confirmed = wx.getStorageSync(key) || false;
    this.setData({ confirmed });
  },

  _loadSteps() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    app.api.getWerunSteps(user.id, 1).then(res => {
      if (res && res.length > 0) {
        const todayData = res.find(r => r.data_date === today);
        this.setData({ todaySteps: todayData ? todayData.steps : 0 });
      }
    }).catch(() => {});
  },

  _loadWeekStats() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=周日
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // 本周一

    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = 'pwb_confirmed_' + d.toISOString().slice(0, 10);
      if (wx.getStorageSync(key)) count++;
    }
    this.setData({ weekConfirmed: count });

    // 加载用药进度条
    this._loadMedProgress();

    // 计算下次吃药提醒时间
    const hour = today.getHours();
    const minute = today.getMinutes();
    if (hour < 8 || (hour === 8 && minute < 50)) {
      this.setData({ nextReminder: '08:50' });
    } else if (hour < 20 || (hour === 20 && minute < 50)) {
      this.setData({ nextReminder: '20:50' });
    } else {
      this.setData({ nextReminder: '明天 08:50' });
    }
  },

  _loadMedProgress() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) return;

    // 获取本周用药统计
    app.api.getMedStats(user.id, 7).then(res => {
      if (res && res.success) {
        // API 返回: { total: 7, taken: 5, rate: 71 }
        const rate = res.data?.rate || 0;
        this.setData({ weekMedProgress: rate });
      }
    }).catch(() => {
      // 失败时使用本周确认次数作为兜底
      const progress = Math.min(100, Math.round((this.data.weekConfirmed / 7) * 100));
      this.setData({ weekMedProgress: progress });
    });
  },

    _loadEcho() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) return;
    app.api.getLatestFeedback(user.id).then(res => {
      if (res && res.has_feedback) {
        this.setData({ echoText: res.text });
      }
    }).catch(() => {});
  },

  // ——— 一键确认 ———
  onOneTapConfirm() {
    if (this.data.confirmed) return;
    this.setData({ showMedSheet: true });
  },

  onCloseMedSheet() {
    this.setData({ showMedSheet: false });
  },

  onMedConfirm(e) {
    const answer = e.currentTarget.dataset.answer;
    const today = new Date().toISOString().slice(0, 10);

    // 本地标记今日已确认
    wx.setStorageSync('pwb_confirmed_' + today, true);

    // 提交到后端
    const user = wx.getStorageSync('pwb_user');
    if (user) {
      // 确认日常
      app.api.confirmDaily(user.id, 'parent', answer === 'taken')
        .catch(() => {});

      // 如果是周日，同时记录用药周确认
      if (new Date().getDay() === 0) {
        app.api.confirmMedWeekly(user.id, answer)
          .catch(() => {});
      }
    }

    this.setData({
      confirmed: true,
      showMedSheet: false
    });

    // 振动反馈
    wx.vibrateShort && wx.vibrateShort({ type: 'medium' });
    wx.showToast({
      title: answer === 'taken' ? '今天辛苦了！' : '记得吃药哦～',
      icon: 'success',
      duration: 2000
    });

    // 刷新周统计
    this._loadWeekStats();
  },

  // ——— 工具 ———
  onReset() {
    const today = new Date().toISOString().slice(0, 10);
    wx.removeStorageSync('pwb_confirmed_' + today);
    this.setData({ confirmed: false });
    this._loadWeekStats();
    wx.showToast({ title: '已重置', icon: 'none' });
  },

  onCopyCode() {
    if (!this.data.inviteCode) return;
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' })
    });
  },

  // ——— 跳转提醒设置 ———
  onGoReminder() {
    wx.navigateTo({ url: '/pages/parent/med-reminder/index' });
  },

  // ——— 跳转扫码帮手 ———
  onGoScan() {
    wx.navigateTo({ url: '/pages/parent/scan/index' });
  },

  // ——— 跳转叫车帮手 ———
  onGoTaxi() {
    wx.navigateTo({ url: '/pages/parent/taxi/index' });
  }
});
