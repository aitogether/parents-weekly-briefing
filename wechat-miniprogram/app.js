// app.js
App({
  globalData: {
    // ── API 配置 ──
    API_BASE_URL: 'http://127.0.0.1:3000',  // 本地开发，真机时改为 Mac 内网 IP
    TOKEN_KEY: 'pwb_auth_token',
    USER_ROLE_KEY: 'pwb_user_role', // 'child' | 'parent'

    // 用户信息
    userInfo: null,
    userRole: null, // 子女端 or 老人端
    token: null
  },

  onLaunch() {
    // 读取本地缓存的 token 和角色
    const token = wx.getStorageSync(this.globalData.TOKEN_KEY);
    const role = wx.getStorageSync(this.globalData.USER_ROLE_KEY);
    if (token) this.globalData.token = token;
    if (role) this.globalData.userRole = role;

    // 检查小程序更新
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

  /** 设置登录态 */
  setAuth(token, role) {
    this.globalData.token = token;
    this.globalData.userRole = role;
    wx.setStorageSync(this.globalData.TOKEN_KEY, token);
    wx.setStorageSync(this.globalData.USER_ROLE_KEY, role);
  },

  /** 清除登录态 */
  clearAuth() {
    this.globalData.token = null;
    this.globalData.userRole = null;
    wx.removeStorageSync(this.globalData.TOKEN_KEY);
    wx.removeStorageSync(this.globalData.USER_ROLE_KEY);
  }
});
