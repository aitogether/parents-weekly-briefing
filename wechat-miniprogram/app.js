// app.js
App({
  globalData: {
    // ── API 配置 ──
    // 开发：填 Mac 内网 IP（如 192.168.1.x）
    // 生产：填你的服务器域名（必须 HTTPS）
    API_BASE_URL: 'http://192.168.1.100:3000',
    
    // 真机调试时自动检测
    // 如果小程序后台配置了 request 合法域名，优先用域名
    // 如果未配置，走本地 IP

    TOKEN_KEY: 'pwb_auth_token',
    USER_ROLE_KEY: 'pwb_user_role',

    userInfo: null,
    userRole: null,
    token: null
  },

  onLaunch() {
    const token = wx.getStorageSync(this.globalData.TOKEN_KEY);
    const role = wx.getStorageSync(this.globalData.USER_ROLE_KEY);
    if (token) this.globalData.token = token;
    if (role) this.globalData.userRole = role;

    this.checkUpdate();
  },

  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          success(res) {
            if (res.confirm) updateManager.applyUpdate();
          }
        });
      });
    }
  },

  setAuth(token, role) {
    this.globalData.token = token;
    this.globalData.userRole = role;
    wx.setStorageSync(this.globalData.TOKEN_KEY, token);
    wx.setStorageSync(this.globalData.USER_ROLE_KEY, role);
  },

  clearAuth() {
    this.globalData.token = null;
    this.globalData.userRole = null;
    wx.removeStorageSync(this.globalData.TOKEN_KEY);
    wx.removeStorageSync(this.globalData.USER_ROLE_KEY);
  }
});
