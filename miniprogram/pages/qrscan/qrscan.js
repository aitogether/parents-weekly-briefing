// pages/qrscan/qrscan.js
Page({
  data: {
    scanHistory: [],
    loading: true
  },

  onLoad() {
    this.loadScanHistory();
  },

  loadScanHistory() {
    const app = getApp();
    app.api.getQRScans().then(res => {
      if (res && res.success) {
        this.setData({ 
          scanHistory: res.scans || [],
          loading: false 
        });
      }
    }).catch(err => {
      console.error('加载扫码记录错误:', err);
      this.setData({ loading: false });
    });
  },

  scanQRCode() {
    // 使用微信原生扫码API
    wx.scanCode({
      success: (res) => {
        if (res.result) {
          this.handleScanResult(res.result);
        } else {
          wx.showToast({
            title: '扫描失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('扫码错误:', err);
        wx.showToast({
          title: '请允许相机权限',
          icon: 'none'
        });
      }
    });
  },

  handleScanResult(result) {
    const app = getApp();
    
    wx.showModal({
      title: '确认扫码',
      content: `是否记录二维码内容：${result}`,
      success: (res) => {
        if (res.confirm) {
          this.doRecordScan(result);
        }
      }
    });
  },

  async doRecordScan(qrValue) {
    try {
      const res = await getApp().api.recordQRScan(qrValue);
      
      if (res && res.success) {
        wx.showToast({
          title: '扫码记录成功',
          icon: 'success'
        });
        this.loadScanHistory(); // 刷新列表
      } else {
        wx.showToast({
          title: res?.message || '记录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('记录扫码错误:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    // TODO: 跳转到详情页或显示详情弹窗
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
});