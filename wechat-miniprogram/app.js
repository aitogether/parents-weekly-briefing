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
    PRIVACY_AGREED_KEY: 'pwb_privacy_agreed',

    userInfo: null,
    userRole: null,
    token: null,
    privacyAgreed: false
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
    const privacyAgreed = wx.getStorageSync(this.globalData.PRIVACY_AGREED_KEY);
    if (token) this.globalData.token = token;
    if (role) this.globalData.userRole = role;
    if (privacyAgreed) this.globalData.privacyAgreed = privacyAgreed;

    // 检查隐私协议状态（微信小程序隐私接口）
    this._checkPrivacyAndShow();

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

  /**
   * 检查隐私协议状态并显示弹窗
   * 遵循微信小程序隐私保护指引
   */
  _checkPrivacyAndShow() {
    // 检查是否已同意隐私协议
    if (this.globalData.privacyAgreed) {
      console.log('[Privacy] 用户已同意隐私协议');
      return;
    }

    // 使用微信隐私接口检查需要授权的隐私信息
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: res => {
          console.log('[Privacy] 隐私设置检查:', res);
          if (res.needAuthorization) {
            // 需要用户授权，显示自定义隐私弹窗
            this._showPrivacyDialog();
          } else {
            // 不需要授权，标记为已同意
            this._setPrivacyAgreed();
          }
        },
        fail: err => {
          console.error('[Privacy] 检查失败:', err);
          // 失败时保守起见，显示隐私弹窗
          this._showPrivacyDialog();
        }
      });
    } else {
      // 低版本微信，使用自定义弹窗
      console.log('[Privacy] 微信版本不支持 getPrivacySetting，使用自定义弹窗');
      this._showPrivacyDialog();
    }
  },

  /**
   * 显示隐私协议弹窗
   */
  _showPrivacyDialog() {
    wx.showModal({
      title: '隐私政策',
      content: '欢迎使用家长周刊。我们将收集您的微信昵称、头像以及健康数据，用于提供用药提醒和周报服务。\n\n点击"同意"即表示您已阅读并同意我们的隐私政策和服务协议。',
      confirmText: '同意',
      cancelText: '不同意',
      showCancel: true,
      success: res => {
        if (res.confirm) {
          // 用户同意
          this._setPrivacyAgreed();
          // 对于微信要求的敏感接口，调用requirePrivacyAuthorize（如需要）
          if (wx.requirePrivacyAuthorize) {
            wx.requirePrivacyAuthorize({
              success: () => {
                console.log('[Privacy] 授权成功');
              },
              fail: err => {
                console.warn('[Privacy] 授权失败:', err);
              }
            });
          }
        } else {
          // 用户拒绝，显示提示并限制功能
          wx.showModal({
            title: '温馨提示',
            content: '不同意隐私政策将无法使用服务。您可以在"设置"-"隐私政策"中随时查看并同意。',
            showCancel: false,
            success: () => {
              // 可以退出小程序或跳转到隐私政策页面
              // wx.reLaunch({ url: '/pages/privacy/index' });
            }
          });
        }
      },
      fail: err => {
        console.error('[Privacy] 弹窗显示失败:', err);
      }
    });
  },

  /**
   * 标记用户已同意隐私协议
   */
  _setPrivacyAgreed() {
    this.globalData.privacyAgreed = true;
    wx.setStorageSync(this.globalData.PRIVACY_AGREED_KEY, true);
    console.log('[Privacy] 用户隐私协议状态已标记为同意');
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
