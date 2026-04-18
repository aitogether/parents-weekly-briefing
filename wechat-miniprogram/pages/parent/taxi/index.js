// pages/parent/taxi/index.js - 叫车帮手
const app = getApp();

Page({
  data: {
    requests: [],
    stats: { total: 0, completed: 0, pending: 0, cancelled: 0 },
    filterStatus: 'all',
    showModal: false,
    formDestination: '',
    formDate: '',
    formTime: '',
    formNotes: ''
  },

  onLoad() {
    this.loadRequests();
    this.loadStats();
  },

  onShow() {
    this.loadRequests();
    this.loadStats();
  },

  onPullDownRefresh() {
    Promise.all([this.loadRequests(), this.loadStats()]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载请求列表
  async loadRequests() {
    try {
      const user = wx.getStorageSync('pwb_user');
      if (!user) return;

      const res = await app.api.getTaxiRequests(user.id, this.data.filterStatus === 'all' ? null : this.data.filterStatus);
      if (res.success) {
        const formatted = res.requests.map(r => ({
          ...r,
          created_date: this.formatDate(r.created_at),
          scheduled_time_display: r.scheduled_time ? this.formatDateTime(r.scheduled_time) : '-'
        }));
        this.setData({ requests: formatted });
      }
    } catch (err) {
      console.error('[taxi] load failed:', err);
    }
  },

  // 加载统计
  async loadStats() {
    try {
      const user = wx.getStorageSync('pwb_user');
      if (!user) return;

      const res = await app.api.getTaxiStats(user.id, 30);
      if (res.success) {
        this.setData({ stats: res.stats });
      }
    } catch (err) {
      console.error('[taxi] stats failed:', err);
    }
  },

  // 筛选变更
  onFilterChange(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status });
    this.loadRequests();
  },

  // 显示创建 Modal
  onShowCreateModal() {
    this.setData({ showModal: true });
  },

  // 隐藏 Modal
  onHideCreateModal() {
    this.setData({ showModal: false, formDestination: '', formDate: '', formTime: '', formNotes: '' });
  },

  stopPropagation() {},

  // 表单输入
  onDestInput(e) { this.setData({ formDestination: e.detail.value }); },
  onNotesInput(e) { this.setData({ formNotes: e.detail.value }); },
  onDateChange(e) { this.setData({ formDate: e.detail.value }); },
  onTimeChange(e) { this.setData({ formTime: e.detail.value }); },

  // 提交创建
  async onSubmit() {
    const { parent_id } = wx.getStorageSync('pwb_user') || {};
    const { formDestination, formDate, formTime } = this.data;

    if (!parent_id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!formDestination.trim()) {
      wx.showToast({ title: '请输入目的地', icon: 'none' });
      return;
    }

    const scheduled_time = formDate && formTime ? `${formDate} ${formTime}:00` : null;

    try {
      wx.showLoading({ title: '创建中...' });
      const res = await app.api.createTaxiRequest(parent_id, formDestination.trim(), scheduled_time, this.data.formNotes);
      wx.hideLoading();

      if (res.success) {
        wx.showToast({ title: '创建成功', icon: 'success' });
        this.onHideCreateModal();
        this.loadRequests();
        this.loadStats();
      } else {
        wx.showToast({ title: res.error || '创建失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },

  // 标记完成
  async onComplete(e) {
    const requestId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认完成',
      content: '标记为已完成后无法撤销',
      confirmColor: '#4CAF50',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.api.updateTaxiStatus(requestId, 'completed');
            if (result.success) {
              wx.showToast({ title: '已标记完成', icon: 'success' });
              this.loadRequests();
              this.loadStats();
            }
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 取消请求
  async onCancel(e) {
    const requestId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个叫车需求吗？',
      confirmColor: '#F44336',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await app.api.updateTaxiStatus(requestId, 'cancelled');
            if (result.success) {
              wx.showToast({ title: '已取消', icon: 'success' });
              this.loadRequests();
              this.loadStats();
            }
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 日期时间格式化
  formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  formatDateTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
});
