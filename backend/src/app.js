require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/store');
const { rateLimit, sanitizeBody, httpsRedirect, securityHeaders } = require('./middleware/security');
const { startScheduler } = require('./scheduler');

const authRoutes = require('./routes/auth');
const werunRoutes = require('./routes/werun');
const medicationRoutes = require('./routes/medication');
const reportRoutes = require('./routes/report');
const feedbackRoutes = require('./routes/feedback');
const surveyRoutes = require('./routes/survey');
const historyRoutes = require('./routes/history');

const app = express();

// ── 安全中间件（P1-6）──
app.use(httpsRedirect);
app.use(securityHeaders);
app.use(rateLimit);

// ── 基础中间件 ──
app.use(express.json());
app.use(cors());

// 注册安全检查路由
const checklistRouter = require('./routes/checklist');
app.use('/api/checklist', checklistRouter);
app.use(sanitizeBody);

// ── 健康检查 ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API 路由 ──
app.use('/api/auth', authRoutes);
app.use('/api/werun', werunRoutes);
app.use('/api/med', medicationRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/report', historyRoutes);

// ── 初始化数据库 ──
initDB();

// ── 启动服务器 ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] 父母周报后端运行在 http://localhost:${PORT}`);
  if (!process.env.WECHAT_APPID) {
    console.log('[Server] ⚠️  WECHAT_APPID 未配置，使用 mock 登录');
  }
  if (!process.env.DATA_ENCRYPTION_KEY) {
    console.log('[Server] ⚠️  DATA_ENCRYPTION_KEY 未配置，数据未加密（开发模式）');
  } else {
    console.log('[Server] 🔒 数据加密已启用');
  }

  // 启动定时调度器（P1-3/4/5）
  startScheduler();
});

module.exports = app;
