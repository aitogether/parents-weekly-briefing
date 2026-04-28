// pages/medication/medication.js
Page({
  data: {
    medPlans: [],
    loading: true,
    todayConfirms: [],
    showAddModal: false,
    newMedName: '',
    newMedTimes: [''],
    selectedDays: [1,2,3,4,5,6,7], // 1-7 代表周一到周日
    confirmRate: 0
  },

  onLoad() {
    this.loadMedPlans();
    this.loadTodayConfirms();
    this.calculateConfirmRate();
  },

  loadMedPlans() {
    const app = getApp();
    app.api.getMedPlans().then(res => {
      if (res && res.success) {
        this.setData({ medPlans: res.plans || [] });
      } else {
        wx.showToast({
          title: '加载用药计划失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('加载用药计划错误:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  loadTodayConfirms() {
    const app = getApp();
    app.api.getTodayMeds().then(res => {
      if (res && res.success) {
        this.setData({ todayConfirms: res.confirms || [] });
      }
    });
  },

  calculateConfirmRate() {
    const { medPlans, todayConfirms } = this.data;
    if (medPlans.length > 0) {
      const rate = Math.round((todayConfirms.length / medPlans.length) * 100);
      this.setData({ confirmRate: rate });
    }
  },

  confirmMed(e) {
    const { planId } = e.currentTarget.dataset;

    wx.showModal({
      title: '确认用药',
      content: '您已按时服药，确认记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.doConfirmMed(planId);
        }
      }
    });
  },

  async doConfirmMed(planId) {
    try {
      const res = await getApp().api.confirmMed(planId);

      if (res && res.success) {
        wx.showToast({
          title: '已确认',
          icon: 'success'
        });
        this.loadTodayConfirms();
        this.calculateConfirmRate();
      } else {
        wx.showToast({
          title: res?.message || '确认失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('确认用药错误:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  },

  addDailyConfirm() {
    wx.cloud.callFunction({
      name: 'medication',
      data: { action: 'addQuickConfirm' }
    }).then(res => {
      if (res.result && res.result.success) {
        this.loadTodayConfirms();
        this.calculateConfirmRate();
        wx.showToast({
          title: '一键确认成功',
          icon: 'success'
        });
      }
    }).catch(err => {
      console.error('一键确认错误:', err);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    });
  },

  showAddModal() {
    this.setData({ showAddModal: true });
  },

  hideAddModal() {
    this.setData({ 
      showAddModal: false, 
      newMedName: '', 
      newMedTimes: [''],
      selectedDays: [1,2,3,4,5,6,7]
    });
  },

  updateMedName(e) {
    this.setData({ newMedName: e.detail.value });
  },

  addTimeSlot() {
    const { newMedTimes } = this.data;
    this.setData({ 
      newMedTimes: [...newMedTimes, ''] 
    });
  },

  updateTimeSlot(e) {
    const { index, value } = e.currentTarget.dataset;
    const { newMedTimes } = this.data;
    const updatedTimes = [...newMedTimes];
    updatedTimes[index] = value;
    this.setData({ newMedTimes: updatedTimes });
  },

  removeTimeSlot(e) {
    const { index } = e.currentTarget.dataset;
    const { newMedTimes } = this.data;
    if (newMedTimes.length > 1) {
      const updatedTimes = newMedTimes.filter((_, i) => i !== index);
      this.setData({ newMedTimes: updatedTimes });
    }
  },

  toggleDay(e) {
    const { day } = e.currentTarget.dataset;
    const { selectedDays } = this.data;
    const isSelected = selectedDays.includes(day);
    
    let updatedDays;
    if (isSelected) {
      updatedDays = selectedDays.filter(d => d !== day);
    } else {
      updatedDays = [...selectedDays, day].sort();
    }
    
    this.setData({ selectedDays: updatedDays });
  },

  submitNewMed() {
    const { newMedName, newMedTimes, selectedDays } = this.data;
    
    if (!newMedName.trim()) {
      wx.showToast({
        title: '请输入药品名称',
        icon: 'none'
      });
      return;
    }

    if (newMedTimes.some(time => !time.trim())) {
      wx.showToast({
        title: '请填写所有用药时间',
        icon: 'none'
      });
      return;
    }

    if (selectedDays.length === 0) {
      wx.showToast({
        title: '请选择用药日期',
        icon: 'none'
      });
      return;
    }

    // TODO: 调用云函数创建新的用药计划
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });

    this.hideAddModal();
  }
});