// pages/parent/scan/index.js - 扫码帮手
const cloudAPI = require('../../../utils/cloud-api');

Page({
  data: {
    scans: [],
    showManualForm: false,
    qrType: 'medicine',
    qrValue: '',
    typeLabels: ['药品', '食品', '商品'],
    formTypeIndex: 0
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  // 加载扫描历史
  async loadHistory() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo._id) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      const res = await cloudAPI.getQRHistory(userInfo._id, 30);
      if (res.success) {
        const scansWithLabels = res.scans.map(s => ({
          ...s,
          typeLabel: this.getTypeLabel(s.qr_type)
        }));
        this.setData({ scans: scansWithLabels });
      }
    } catch (err) {
      console.error('[scan] load history failed:', err);
    }
  },

  // 获取类型标签
  getTypeLabel(type) {
    const map = { medicine: '药品', food: '食品', product: '商品' };
    return map[type] || '其他';
  },

  // 点击扫描按钮（调用微信扫一扫）
  onScan() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        const { result } = res;
        this.handleScanResult('medicine', result);  // 默认药品类型，可让用户选择
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '扫码失败', icon: 'none' });
        }
      }
    });
  },

  // 选择手动录入类型
  onSelectType(e) {
    const type = e.currentTarget.dataset.type;
    const typeIndex = { medicine: 0, food: 1, product: 2 }[type];
    this.setData({
      qrType: type,
      formTypeIndex: typeIndex,
      showManualForm: true
    });
  },

  // 类型选择器变更
  onTypeChange(e) {
    const index = e.detail.value;
    const types = ['medicine', 'food', 'product'];
    this.setData({
      formTypeIndex: index,
      qrType: types[index]
    });
  },

  // 二维码内容输入
  onQrInput(e) {
    this.setData({ qrValue: e.detail.value });
  },

  // 提交手动录入
  async onSubmitManual() {
    const { parent_id } = wx.getStorageSync('userInfo') || {};
    const { qrType, qrValue } = this.data;

    if (!parent_id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!qrValue.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      const res = await cloudAPI.scanQRCode(parent_id, qrType, qrValue.trim());
      wx.hideLoading();

      if (res.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.setData({ showManualForm: false, qrValue: '' });
        this.loadHistory();
      } else {
        wx.showToast({ title: res.error || '保存失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },

  // 删除记录
  async onDelete(e) {
    const scanId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#FA5151',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await cloudAPI.deleteQRScan(scanId);
            if (result.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.loadHistory();
            }
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
