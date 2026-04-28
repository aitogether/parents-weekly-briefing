// pages/qrscan/qrscan.js
const utils = require('./qrscan-utils');

Page({
  data: {
    scanHistory: [],
    loading: true,
    currentScan: '',
    showResultModal: false,
    recentScans: []
  },

  onLoad() {
    this.loadScanHistory();
    this.loadRecentScans();
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

  loadRecentScans() {
    // 获取最近5次扫描结果用于快速访问
    const app = getApp();
    app.api.getRecentQRScans().then(res => {
      if (res && res.success) {
        this.setData({ recentScans: res.recentScans || [] });
      }
    });
  },

  scanQRCode() {
    // 检查相机权限
    wx.getSetting({
      success: (settingRes) => {
        if (!settingRes.authSetting['scope.camera']) {
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              this.performScan();
            },
            fail: () => {
              wx.showModal({
                title: '需要相机权限',
                content: '请在设置中开启相机权限以使用扫码功能',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            }
          });
        } else {
          this.performScan();
        }
      }
    });
  },

  performScan() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        if (res.result) {
          this.currentScan = res.result;
          this.setData({ 
            currentScan: res.result,
            showResultModal: true 
          });
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
    this.setData({
      currentScan: result,
      showResultModal: true
    });
  },

  confirmRecord() {
    this.doRecordScan(this.currentScan);
  },

  cancelRecord() {
    this.setData({
      showResultModal: false,
      currentScan: ''
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

        // 添加到最近扫描列表
        const { recentScans } = this.data;
        const updatedRecent = [qrValue, ...recentScans.filter(s => s !== qrValue)].slice(0, 10);
        
        this.setData({
          scanHistory: [res.scan, ...this.data.scanHistory],
          recentScans: updatedRecent,
          showResultModal: false,
          currentScan: ''
        });
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

  quickScan(e) {
    const qrValue = e.currentTarget.dataset.value;
    this.setData({
      currentScan: qrValue,
      showResultModal: true
    });
  },

  viewDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/qrscan/detail?id=${id}`
    });
  },

  deleteScan(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条扫码记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteScan(id);
        }
      }
    });
  },

  async doDeleteScan(scanId) {
    try {
      const res = await getApp().api.deleteQRScan(scanId);
      
      if (res && res.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        this.loadScanHistory();
      } else {
        wx.showToast({
          title: res?.message || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('删除扫码记录错误:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },

  clearAllHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空所有扫码记录吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          this.doClearAllHistory();
        }
      }
    });
  },

  async doClearAllHistory() {
    try {
      const res = await getApp().api.clearQRScanHistory();
      
      if (res && res.success) {
        wx.showToast({
          title: '清空成功',
          icon: 'success'
        });
        this.setData({
          scanHistory: [],
          recentScans: []
        });
      } else {
        wx.showToast({
          title: res?.message || '清空失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('清空扫码历史错误:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },

  formatCurrentTime() {
    return utils.formatCurrentTime();
  },

  detectQRType(content) {
    return utils.detectQRType(content);
  }
});