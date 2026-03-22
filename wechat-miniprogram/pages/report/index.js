Page({
  data: {
    report: {
      weekRange: '3月30日 - 4月5日',
      summary: {
        level: 'green',
        title: '本周不用操心',
        oneLiner: '爸妈这周都挺好，你可以放心忙自己的事。'
      },
      parentA: {
        label: '妈',
        medAdherence: { rate: 100, trend: 'up', note: '连续第2周全勤' },
        steps: { dailyAvg: 3910, trend: 'stable', note: '与上月持平' },
        heartRate: { anomalies: 0 }
      },
      parentB: {
        label: '爸',
        steps: { dailyAvg: 1650, trend: 'up', note: '恢复到上月水平，周六 2,280 步——出门了' },
        heartRate: { anomalies: 0 }
      },
      action: {
        text: '这周不需要特意打电话谈正事。'
      },
      youMayWonder: [
        '爸周六出门了——去哪了？跟谁？',
        '妈血压连着两周没偏高——她最近心情怎么样？'
      ]
    }
  },

  onLoad() {
    console.log('周报页面加载');
  },

  onFeedback(e) {
    const type = e.currentTarget.dataset.type;
    wx.showToast({ title: '已记录', icon: 'success' });
    console.log('用户反馈:', type);
  }
});
