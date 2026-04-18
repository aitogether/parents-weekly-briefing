Page({
  data: {
    safetyCompleted: 0,
    // 情绪相关状态
    showEmotionCard: true,
    emotionLevel: 0,
    lastEmotion: null,
    emotionHistory: [],
    emotionSummary: null
  },

  onLoad() {
    this.loadSafety();
    this.loadEmotionData();
  },

  // ── 安全检查 ──
  loadSafety() {
    wx.request({
      url: getApp().globalData.apiBase + '/api/checklist/weekly',
      header: { 'Authorization': 'Bearer ' + wx.getStorageSync('token') },
      success: (res) => {
        if (res.data.success) {
          this.setData({ safetyCompleted: res.data.data.completed_count });
        }
      }
    });
  },

  goChecklist() {
    wx.navigateTo({ url: '/pages/checklist/checklist' });
  },

  // ── 情绪功能 ──

  /**
   * 加载情绪数据
   * 1. 检查本周是否已记录
   * 2. 获取近4周历史
   * 3. 计算趋势和异常
   */
  async loadEmotionData() {
    const parentId = getApp().globalData.parentId;
    if (!parentId) return;

    try {
      // 获取近4周情绪历史
      const res = await getApp().api.getEmotionHistory(parentId, 4);
      if (res && res.success) {
        const history = res.data || [];
        this.setData({ emotionHistory: history });

        // 检查本周是否已记录（第一条就是本周的记录）
        const thisWeekRecord = history.length > 0 ? history[0] : null;
        if (thisWeekRecord && thisWeekRecord.week_start) {
          this.setData({
            showEmotionCard: false,
            lastEmotion: {
              ...thisWeekRecord,
              level_text: this.getEmotionLevelText(thisWeekRecord.emotion_level)
            }
          });
        }

        // 计算情绪总结
        const summary = this.calculateEmotionSummary(history);
        this.setData({ emotionSummary: summary });
      }
    } catch (err) {
      console.error('[Report] 加载情绪数据失败', err);
    }
  },

  /**
   * 选择情绪等级
   */
  onSelectEmotion(e) {
    const level = parseInt(e.currentTarget.dataset.level);
    this.setData({ emotionLevel: level });
  },

  /**
   * 提交情绪记录
   */
  async onSubmitEmotion() {
    const { emotionLevel } = this.data;
    if (!emotionLevel) return;

    const parentId = getApp().globalData.parentId;
    const childId = getApp().globalData.childId;
    const weekStart = this.getWeekStart(new Date());

    try {
      wx.showLoading({ title: '记录中...' });

      const res = await getApp().api.logEmotion(parentId, emotionLevel, childId, weekStart);

      wx.hideLoading();

      if (res && res.success) {
        wx.showToast({ title: '记录成功', icon: 'success' });

        // 更新状态
        this.setData({
          showEmotionCard: false,
          lastEmotion: {
            emotion_emoji: res.data.emotion_emoji,
            emotion_level: emotionLevel,
            week_start: weekStart,
            level_text: this.getEmotionLevelText(emotionLevel)
          },
          emotionLevel: 0
        });

        // 重新计算总结
        this.loadEmotionData();
      } else {
        wx.showToast({ title: res?.error || '记录失败，请重试', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
      console.error('[Report] 提交情绪失败', err);
    }
  },

  /**
   * 获取本周一日期
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().slice(0, 10);
  },

  /**
   * 情绪等级文本映射
   */
  getEmotionLevelText(level) {
    const map = {
      1: '😊 积极',
      2: '😐 一般',
      3: '😢 低落',
      4: '😠 烦躁',
      5: '😰 焦虑'
    };
    return map[level] || '未知';
  },

  /**
   * 计算情绪总结
   * 规则：
   *  - 本周情绪等级
   *  - 近4周趋势（好转/持平/下降）
   *  - 异常检测：连续2周低落（level >= 3）→ 警告
   */
  calculateEmotionSummary(history) {
    if (!history || history.length === 0) {
      return null;
    }

    const currentWeek = history[0];
    const currentLevel = currentWeek.emotion_level;
    const currentLevelText = this.getEmotionLevelText(currentLevel);

    // 趋势计算
    let trend = null;
    let trendText = '';
    if (history.length >= 2) {
      const lastWeek = history[1];
      const lastLevel = lastWeek.emotion_level;

      if (currentLevel === lastLevel) {
        trend = 'stable';
        trendText = '与上周持平';
      } else if (currentLevel < lastLevel) {
        trend = 'improving';
        trendText = '情绪好转';
      } else {
        trend = 'declining';
        trendText = '情绪下降';
      }
    } else {
      trendText = '暂无趋势数据';
    }

    // 异常检测：连续2周情绪低落（level >= 3）
    let alert = null;
    let alertMessage = '';
    if (history.length >= 2) {
      const recent2 = history.slice(0, 2);
      const isLow1 = recent2[0].emotion_level >= 3;
      const isLow2 = recent2[1].emotion_level >= 3;
      if (isLow1 && isLow2) {
        alert = true;
        alertMessage = '父母近期情绪持续低落，建议主动联系';
      }
    }

    return {
      currentLevel,
      currentLevelText,
      trend,
      trendText,
      alert,
      alertMessage
    };
  },

  // ── 反馈 ──
  onFeedback(e) {
    const type = e.currentTarget.dataset.type;
    wx.showToast({ title: '已记录', icon: 'success' });
    console.log('用户反馈:', type);
  }
});
