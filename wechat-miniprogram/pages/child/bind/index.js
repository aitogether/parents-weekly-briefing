// pages/child/bind/index.js — 子女通过邀请码绑定父母
const app = getApp();

Page({
  data: {
    inviteCode: '',
    loading: false,
    errorMsg: ''
  },

  onInput(e) {
    this.setData({
      inviteCode: e.detail.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
      errorMsg: ''
    });
  },

  onBind() {
    const code = this.data.inviteCode;
    if (code.length !== 6) {
      this.setData({ errorMsg: '请输入 6 位邀请码' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    wx.request({
      url: `${app.globalData.API_BASE_URL}/api/auth/bind`,
      method: 'POST',
      header: { 'Authorization': `Bearer ${app.globalData.token}` },
      data: { invite_code: code },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          // 更新本地缓存
          const user = wx.getStorageSync('pwb_user') || {};
          user.bound_to = res.data.parent.id;
          user.parent = res.data.parent;
          wx.setStorageSync('pwb_user', user);

          wx.showToast({ title: '绑定成功！', icon: 'success' });
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/child/weekly-report/index' });
          }, 1000);
        } else {
          this.setData({
            errorMsg: res.data?.error || '绑定失败，请重试',
            loading: false
          });
        }
      },
      fail: () => {
        this.setData({ errorMsg: '网络异常，请重试', loading: false });
      }
    });
  },

  // 开发用：一键创建测试父母并绑定
  onQuickTest() {
    wx.request({
      url: `${app.globalData.API_BASE_URL}/api/auth/seed-parent`,
      method: 'POST',
      data: { nickname: '妈妈' },
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          const code = res.data.user.invite_code;
          this.setData({ inviteCode: code });
          wx.showModal({
            title: '测试父母已创建',
            content: `邀请码: ${code}\n昵称: ${res.data.user.nickname}`,
            confirmText: '自动绑定',
            success: (r) => {
              if (r.confirm) this.onBind();
            }
          });
        }
      }
    });
  }
});
