// pages/login/login.js
Page({
  data: {
    selectedRole: '',
    privacyAgreed: false,
    loading: false
  },

  onLoad() {
    // 检查是否已登录
    const app = getApp();
    if (app.globalData.userRole) {
      wx.switchTab({
        url: app.globalData.userRole === 'parent' ? '/pages/report/report' : '/pages/checklist/checklist'
      });
    }
  },

  selectRole(e) {
    this.setData({
      selectedRole: e.currentTarget.dataset.role
    });
  },

  agreePrivacy() {
    this.setData({
      privacyAgreed: true
    });
  },

  disagreePrivacy() {
    this.setData({
      privacyAgreed: false
    });
  },

  async doLogin() {
    const { selectedRole, privacyAgreed } = this.data;
    
    if (!selectedRole) {
      wx.showToast({
        title: '请选择身份',
        icon: 'none'
      });
      return;
    }

    if (!privacyAgreed) {
      wx.showToast({
        title: '请同意隐私政策',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await getApp().api.login(selectedRole);
      
      if (res && res.success) {
        const app = getApp();
        app.setAuth(res.token, selectedRole);
        
        // 跳转到对应页面
        const targetUrl = selectedRole === 'parent' ? '/pages/report/report' : '/pages/checklist/checklist';
        wx.switchTab({
          url: targetUrl
        });
      } else {
        wx.showToast({
          title: res?.message || '登录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});