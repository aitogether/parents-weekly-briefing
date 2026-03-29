require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/store');
const authRoutes = require('./routes/auth');
const werunRoutes = require('./routes/werun');
const medicationRoutes = require('./routes/medication');
const reportRoutes = require('./routes/report');
const feedbackRoutes = require('./routes/feedback');

const app = express();
app.use(express.json());
app.use(cors());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/werun', werunRoutes);
app.use('/api/med', medicationRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/feedback', feedbackRoutes);

// 初始化数据库
initDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] 父母周报后端运行在 http://localhost:${PORT}`);
  if (!process.env.WECHAT_APPID) {
    console.log('[Server] ⚠️  WECHAT_APPID 未配置，使用 mock 登录');
  }
});

module.exports = app;
