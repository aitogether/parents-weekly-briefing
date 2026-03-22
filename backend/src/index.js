const express = require('express');
const app = express();

app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock 周报生成接口（符合 PRD §6 结构）
app.post('/v1/weekly-briefing/generate', (req, res) => {
  // P0: 从请求体接收用户ID，返回 mock 周报
  // P1: 从数据库拉取真实数据，经规则引擎生成
  const { userId } = req.body || {};

  res.json({
    reportId: `rpt_${Date.now()}`,
    weekRange: '3月16日 - 3月22日',
    summary: {
      level: 'green',
      title: '本周不用操心',
      oneLiner: '爸妈这周都挺好，你可以放心忙自己的事。'
    },
    parentA: {
      label: '妈',
      medAdherence: {
        rate: 100,
        trend: 'up',
        note: '连续第2周全勤'
      },
      steps: {
        dailyAvg: 3910,
        trend: 'stable',
        note: '与上月持平'
      },
      heartRate: {
        anomalies: 0
      }
    },
    parentB: {
      label: '爸',
      steps: {
        dailyAvg: 1650,
        trend: 'up',
        note: '恢复到上月水平，周六 2,280 步'
      },
      heartRate: {
        anomalies: 0
      }
    },
    action: {
      text: '本周无需特意打电话谈正事。'
    },
    youMayWonder: [
      '爸周六出门了——去哪了？跟谁？',
      '妈血压连着两周没偏高——她最近心情怎么样？'
    ]
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`PWB backend listening on port ${port}`);
});
