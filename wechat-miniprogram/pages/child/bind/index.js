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

    app.api.bindInvite(code).then(res => {
      const user = wx.getStorageSync('pwb_user') || {};
      user.bound_to = res.parent.id;
      user.parent = res.parent;
      wx.setStorageSync('pwb_user', user);
      wx.showToast({ title: '绑定成功！', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/child/weekly-report/index' });
      }, 1000);
    }).catch(err => {
      this.setData({ errorMsg: err.message || '绑定失败，请重试', loading: false });
    });
  },

  // 开发用：一键创建测试父母并绑定
  onQuickTest() {
    app.api.seedParent('妈妈').then(res => {
      const code = res.user.invite_code;
      this.setData({ inviteCode: code });
      wx.showModal({
        title: '测试父母已创建',
        content: '邀请码: ' + code + '\n昵称: ' + res.user.nickname,
        confirmText: '自动绑定',
        success: (r) => {
          if (r.confirm) this.onBind();
        }
      });
    }).catch(() => {
      wx.showToast({ title: '创建测试父母失败', icon: 'none' });
    });
  }
});
