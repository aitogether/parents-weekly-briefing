// pages/child/weekly-chart/index.js — 步数折线图 P2-2
const app = getApp();

Page({
  data: {
    weekRange: '',
    chartData: [],
    avgSteps: 0,
    maxDaySteps: 0,
    minDaySteps: 0,
    maxSteps: 0,
    midSteps: 0,
    trendText: ''
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    const user = wx.getStorageSync('pwb_user');
    if (!user) return;

    // 获取绑定的父母
    const parentIds = user.bound_to
      ? (Array.isArray(user.bound_to) ? user.bound_to : [user.bound_to])
      : [];

    if (parentIds.length === 0) return;

    try {
      // 获取第一个父母的步数
      const res = await app.api.getWerunSteps(parentIds[0], 7);
      const steps = res.steps || [];

      if (steps.length === 0) {
        this.setData({ chartData: [] });
        return;
      }

      // 周期
      const dates = steps.map(s => s.date).sort();
      const start = dates[0];
      const end = dates[dates.length - 1];
      const fmt = d => `${parseInt(d.slice(5, 7))}/${parseInt(d.slice(8))}`;
      this.setData({ weekRange: `${fmt(start)} - ${fmt(end)}` });

      // 计算图表数据
      const maxSteps = Math.max(...steps.map(s => s.step_count), 100);
      const roundedMax = Math.ceil(maxSteps / 1000) * 1000;
      const midSteps = Math.round(roundedMax / 2);

      const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

      const chartData = steps.map(s => {
        const d = new Date(s.date);
        const dayOfWeek = d.getDay();
        const heightPct = Math.max(5, Math.round((s.step_count / roundedMax) * 100));
        const level = s.step_count >= 3000 ? 'green' : s.step_count >= 1000 ? 'yellow' : 'red';

        return {
          date: s.date,
          steps: s.step_count,
          dayLabel: dayLabels[dayOfWeek],
          heightPct,
          level
        };
      });

      const allSteps = steps.map(s => s.step_count);
      const avgSteps = Math.round(allSteps.reduce((a, b) => a + b, 0) / allSteps.length);
      const maxDaySteps = Math.max(...allSteps);
      const minDaySteps = Math.min(...allSteps);

      // 趋势判断
      let trendText = '整体稳定';
      if (allSteps.length >= 4) {
        const mid = Math.floor(allSteps.length / 2);
        const firstHalf = allSteps.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const secondHalf = allSteps.slice(mid).reduce((a, b) => a + b, 0) / (allSteps.length - mid);
        if (firstHalf > 0) {
          const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
          if (pct > 15) trendText = `📈 后半周比前半周多了 ${pct}%，越走越多`;
          else if (pct < -15) trendText = `📉 后半周比前半周少了 ${Math.abs(pct)}%，越走越少`;
          else trendText = '➡️ 整体稳定，波动不大';
        }
      }

      this.setData({
        chartData, avgSteps, maxDaySteps, minDaySteps,
        maxSteps: roundedMax, midSteps, trendText
      });
    } catch (e) {
      console.error('加载步数失败:', e);
    }
  },

  onGoHistory() {
    wx.navigateTo({ url: '/pages/child/history-compare/index' });
  }
});
