// pages/index/index.js — 角色选择首页
const app = getApp();

Page({
  data: {},

  onLoad() {
    // 如果已有登录态 + 角色，直接跳转
    const token = app.globalData.token;
    const role = app.globalData.userRole;
    if (token && role) {
      this._redirectTo(role);
    }
  },

  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    // 调用登录接口
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
                // 存储完整用户信息
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
  },

  _redirectTo(role) {
    if (role === 'parent') {
      wx.redirectTo({ url: '/pages/parent/home/index' });
    } else {
      const user = wx.getStorageSync('pwb_user');
      // 子女：已绑定 → 周报，未绑定 → 绑定页
      if (user && user.bound_to) {
        wx.redirectTo({ url: '/pages/child/weekly-report/index' });
      } else {
        wx.redirectTo({ url: '/pages/child/bind/index' });
      }
    }
  }
});
