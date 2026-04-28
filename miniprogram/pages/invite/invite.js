// pages/invite/invite.js
Page({
  data: {
    inviteCode: '',
    qrCodeUrl: '',
    inviteLink: '',
    parentInfo: null,
    loading: false,
    showInviteModal: false,
    inviteType: 'child' // 'child' or 'parent'
  },

  onLoad(options) {
    const { type, code } = options;
    
    if (type === 'parent' && code) {
      // 父母通过邀请码注册
      this.setData({ inviteType: 'parent', inviteCode: code });
      this.verifyInviteCode(code);
    } else {
      // 子女查看自己的邀请信息
      this.setData({ inviteType: 'child' });
      this.generateInviteInfo();
    }
  },

  generateInviteInfo() {
    // 生成子女的邀请信息
    wx.cloud.callFunction({
      name: 'invite',
      data: { action: 'generateChildInvite' }
    }).then(res => {
      if (res.result && res.result.success) {
        const { inviteCode, qrCodeUrl, inviteLink } = res.result.data;
        this.setData({
          inviteCode,
          qrCodeUrl,
          inviteLink,
          loading: false
        });
      }
    }).catch(err => {
      console.error('生成邀请信息错误:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  verifyInviteCode(inviteCode) {
    // 验证父母的邀请码
    wx.cloud.callFunction({
      name: 'invite',
      data: { action: 'verifyParentInvite', inviteCode }
    }).then(res => {
      if (res.result && res.result.success) {
        const { childInfo } = res.result.data;
        this.setData({
          parentInfo: childInfo,
          loading: false
        });
      } else {
        wx.showToast({
          title: '无效的邀请码',
          icon: 'error'
        });
      }
    }).catch(err => {
      console.error('验证邀请码错误:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  shareInvite() {
    const { inviteLink, inviteCode } = this.data;
    
    wx.shareAppMessage({
      title: '请用父母这一周关注您的健康',
      desc: `我是${wx.getStorageSync('userInfo')?.nickname || '您的小孩'}，邀请您使用"父母这一周"来记录健康数据`,
      imageUrl: '/images/share-invite.png',
      path: `/pages/invite/invite?type=parent&code=${inviteCode}`
    });

    // 显示分享弹窗
    this.setData({ showInviteModal: true });
  },

  copyInviteLink() {
    const { inviteLink } = this.data;
    
    wx.setClipboardData({
      data: inviteLink,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      }
    });
  },

  shareQRCode() {
    const { qrCodeUrl } = this.data;
    
    wx.previewImage({
      urls: [qrCodeUrl],
      current: qrCodeUrl
    });
  },

  confirmRegistration() {
    // 父母确认注册并绑定关系
    const { inviteCode } = this.data;
    
    wx.navigateTo({
      url: `/pages/login/login?inviteCode=${inviteCode}&isInvited=true`
    });
  },

  goBack() {
    wx.navigateBack();
  },

  closeInviteModal() {
    this.setData({ showInviteModal: false });
  }
});