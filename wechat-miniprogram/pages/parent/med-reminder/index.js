// pages/parent/med-reminder/index.js — 用药提醒设置 v0.2
const app = getApp();

Page({
  data: {
    reminderTimes: ['09:00', '21:00'],
    showPicker: false,
    pickerValue: [8, 0], // 默认 09:00（hours[8]=09, minutes[0]=00）
    hours: [],
    minutes: []
  },

  onLoad() {
    // 构建小时和分钟列表
    const hours = [];
    for (let i = 0; i < 24; i++) hours.push(String(i).padStart(2, '0'));
    const minutes = [];
    for (let i = 0; i < 60; i += 5) minutes.push(String(i).padStart(2, '0'));

    this.setData({ hours, minutes });
    this._loadSettings();
  },

  _loadSettings() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) return;
    app.api.getReminderSettings(user.id).then(res => {
      if (res && res.reminder_times && res.reminder_times.length > 0) {
        this.setData({ reminderTimes: res.reminder_times });
      }
    }).catch(() => {});
  },

  getRemindTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    let newM = m - 10;
    let newH = h;
    if (newM < 0) {
      newM += 60;
      newH -= 1;
    }
    if (newH < 0) newH += 24;
    return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
  },

  onAddTime() {
    if (this.data.reminderTimes.length >= 3) return;
    this.setData({ showPicker: true, pickerValue: [8, 0] });
  },

  onDeleteTime(e) {
    const index = e.currentTarget.dataset.index;
    const times = [...this.data.reminderTimes];
    times.splice(index, 1);
    this.setData({ reminderTimes: times });
  },

  onPickerChange(e) {
    this.setData({ pickerValue: e.detail.value });
  },

  onConfirmPicker() {
    const { pickerValue, hours, minutes, reminderTimes } = this.data;
    const newTime = hours[pickerValue[0]] + ':' + minutes[pickerValue[1]];

    // 检查重复
    if (reminderTimes.includes(newTime)) {
      wx.showToast({ title: '该时间已设置', icon: 'none' });
      return;
    }

    const times = [...reminderTimes, newTime].sort();
    this.setData({ reminderTimes: times, showPicker: false });
  },

  onClosePicker() {
    this.setData({ showPicker: false });
  },

  async onSave() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    try {
      await app.api.saveReminderSettings(user.id, this.data.reminderTimes);
      wx.showToast({ title: '保存成功', icon: 'success' });

      // 请求订阅消息授权
      this._requestSubscribeAuth();

      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  _requestSubscribeAuth() {
    // 请求微信订阅消息授权（用药提醒模板）
    if (wx.requestSubscribeMessage) {
      wx.requestSubscribeMessage({
        tmplIds: ['用药提醒模板ID'], // 需要在小程序后台配置
        success(res) {
          console.log('[Reminder] 订阅消息授权结果:', res);
        },
        fail(err) {
          console.log('[Reminder] 订阅消息授权失败:', err);
        }
      });
    }
  }
});
