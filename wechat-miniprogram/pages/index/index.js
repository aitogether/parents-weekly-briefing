// pages/index/index.js — 角色选择首页
const app = getApp();

Page({
  data: {},

  onLoad() {
    const token = app.globalData.token;
    const role = app.globalData.userRole;
    if (token && role) {
      this._redirectTo(role);
    }
  },

  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;

    if (app.globalData.API_MODE === 'cloud') {
      // 云函数模式：直接调用，不需要 wx.login
      app.api.login(role).then(res => {
        app.setAuth(res.user.id, role);
        wx.setStorageSync('pwb_user', res.user);
        this._redirectTo(role);
      }).catch(err => {
        wx.showToast({ title: '登录失败', icon: 'none' });
      });
    } else {
      // REST 模式：需要 wx.login 获取 code
      wx.login({
        success: (res) => {
          if (res.code) {
            wx.request({
              url: `${app.globalData.API_BASE_URL}/api/auth/login`,
              method: 'POST',
              data: { code: res.code, role },
              success: (resp) => {
                if (resp.statusCode === 200 && resp.data.token) {
                  app.setAuth(resp.data.token, role);
                  wx.setStorageSync('pwb_user', resp.data.user);
                  this._redirectTo(role);
                } else {
                  wx.showToast({ title: '登录失败', icon: 'none' });
                }
              },
              fail: () => {
                wx.showToast({ title: '网络异常', icon: 'none' });
              }
            });
          }
        }
      });
    }
  },

  _redirectTo(role) {
    if (role === 'parent') {
      wx.redirectTo({ url: '/pages/parent/home/index' });
    } else {
      const user = wx.getStorageSync('pwb_user');
      if (user && user.bound_to) {
        wx.redirectTo({ url: '/pages/child/weekly-report/index' });
      } else {
        wx.redirectTo({ url: '/pages/child/bind/index' });
      }
    }
  }
});
