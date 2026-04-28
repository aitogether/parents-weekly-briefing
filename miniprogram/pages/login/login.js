// pages/login/login.js
Page({
  data: {
    selectedRole: '',
    privacyAgreed: false,
    loading: false,
    showUserAgreement: false,
    showPrivacyPolicy: false,
    userAgreementContent: '',
    privacyPolicyContent: ''
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

  showUserAgreement() {
    this.setData({ showUserAgreement: true, showPrivacyPolicy: false });
    this.loadLegalDocument('user');
  },

  showPrivacyPolicy() {
    this.setData({ showPrivacyPolicy: true, showUserAgreement: false });
    this.loadLegalDocument('privacy');
  },

  loadLegalDocument(type) {
    // 模拟加载法律文档内容
    const contentMap = {
      user: '用户协议\n\n欢迎使用父母这一周应用。通过本协议，您同意我们提供的服务并了解相关权利义务...',
      privacy: '隐私政策\n\n我们重视您的隐私保护。本政策说明我们如何收集、使用和保护您的个人信息...'
    };
    
    this.setData({
      [`${type}AgreementContent`]: contentMap[type]
    });
  },

  closeLegalModal() {
    this.setData({
      showUserAgreement: false,
      showPrivacyPolicy: false
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