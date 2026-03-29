// app.js
App({
  globalData: {
    // ── 模式切换 ──
    // 'cloud' = 云函数（无需服务器，推荐）
    // 'rest'  = REST API（自建后端）
    API_MODE: 'cloud',

    // REST API 配置（仅 mode='rest' 时生效）
    API_BASE_URL: 'http://192.168.1.100:3000',

    // 云开发环境 ID（替换为你的真实环境 ID）
    CLOUD_ENV: 'prod-你的环境ID',

    TOKEN_KEY: 'pwb_auth_token',
    USER_ROLE_KEY: 'pwb_user_role',

    userInfo: null,
    userRole: null,
    token: null
  },

  onLaunch() {
    // 初始化云开发
    if (this.globalData.API_MODE === 'cloud') {
      wx.cloud.init({
        env: this.globalData.CLOUD_ENV,
        traceUser: true
      });
      // 注册云函数到本地（开发时让工具知道有哪些云函数）
      this._registerCloudApi();
    }

    const token = wx.getStorageSync(this.globalData.TOKEN_KEY);
    const role = wx.getStorageSync(this.globalData.USER_ROLE_KEY);
    if (token) this.globalData.token = token;
    if (role) this.globalData.userRole = role;

    this.checkUpdate();
  },

  /**
   * 根据当前模式返回 API 模块
   * 前端统一用 getApp().api 来调用，不用关心底层走云函数还是 REST
   */
  _registerCloudApi() {
    if (this.globalData.API_MODE === 'cloud') {
      this.api = require('./utils/cloud-api');
    } else {
      this.api = require('./utils/api');
    }
  },

  // 兼容：未调 _registerCloudApi 时延迟加载
  get api() {
    if (this._api) return this._api;
    if (this.globalData.API_MODE === 'cloud') {
      this._api = require('./utils/cloud-api');
    } else {
      this._api = require('./utils/api');
    }
    return this._api;
  },
  set api(v) { this._api = v; },

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
