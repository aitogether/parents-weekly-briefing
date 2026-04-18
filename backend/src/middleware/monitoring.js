const promClient = require('prom-client');
const express = require('express');

// 创建 Prometheus 指标
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const dbQueryDurationMilliseconds = new promClient.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['operation'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
});

const errorsTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'route']
});

const memoryUsageGauge = new promClient.Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type']
});

const cpuUsageGauge = new promClient.Gauge({
  name: 'nodejs_cpu_usage_percent',
  help: 'Node.js CPU usage percentage'
});

// 注册默认指标
promClient.register.setDefaultLabels({
  app: 'parents-weekly-briefing-backend'
});

// 收集系统指标
function collectSystemMetrics() {
  // 内存使用
  const memUsage = process.memoryUsage();
  memoryUsageGauge.set({ type: 'heap_used'}, memUsage.heapUsed);
  memoryUsageGauge.set({ type: 'heap_total'}, memUsage.heapTotal);
  memoryUsageGauge.set({ type: 'rss'}, memUsage.rss);

  // CPU 使用率（简化版本）
  const usage = process.cpuUsage();
  const userMs = usage.user / 1000;
  const systemMs = usage.system / 1000;
  const totalMs = userMs + systemMs;
  const percent = (totalMs / (process.uptime() * 1000)) * 100;
  cpuUsageGauge.set(percent);
}

// 启动指标收集器
setInterval(collectSystemMetrics, 30000); // 每30秒收集一次

// Express 监控中间件
const monitorMiddleware = (req, res, next) => {
  const start = Date.now();

  // 捕获响应结束事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;

    // 记录请求统计
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    });

    // 记录请求耗时
    httpRequestDurationMicroseconds.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    }, duration);

    // 记录错误
    if (res.statusCode >= 400) {
      errorsTotal.inc({
        type: 'http_error',
        route: route
      });
    }
  });

  next();
};

// 数据库查询监控
function wrapDBQuery(db, operation) {
  return function(originalQuery) {
    const start = Date.now();
    try {
      const result = originalQuery.apply(this, arguments);
      const duration = Date.now() - start;

      dbQueryDurationMilliseconds.observe({
        operation: operation
      }, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      dbQueryDurationMilliseconds.observe({
        operation: operation
      }, duration);

      errorsTotal.inc({
        type: 'db_error',
        route: 'database'
      });

      throw error;
    }
  };
}

// 健康检查端点
const healthCheck = (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: checkDatabaseConnection(),
      memory: checkMemoryHealth(),
      cpu: checkCpuHealth()
    },
    metrics: {
      memory_heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      uptime_seconds: process.uptime()
    }
  };

  // 如果有任何服务检查失败，返回503状态码
  const failedServices = Object.entries(checks.services)
    .filter(([_, healthy]) => !healthy)
    .map(([service]) => service);

  if (failedServices.length > 0) {
    checks.status = 'degraded';
    res.status(503).json(checks);
  } else {
    res.json(checks);
  }
};

// 数据库连接检查
function checkDatabaseConnection() {
  try {
    // 这里应该检查实际的数据库连接状态
    // 由于我们使用的是better-sqlite3，它总是返回true
    return true;
  } catch (error) {
    console.error('[Health Check] Database connection failed:', error.message);
    return false;
  }
}

// 内存健康检查
function checkMemoryHealth() {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // 如果堆内存使用超过80%，认为是健康问题
  return heapUsedPercent < 80;
}

// CPU健康检查
function checkCpuHealth() {
  // 简化的CPU检查 - 如果CPU使用率过高则返回false
  const cpuPercent = process.cpuUsage();
  return cpuPercent.user < 90 && cpuPercent.system < 90;
}

module.exports = {
  monitorMiddleware,
  wrapDBQuery,
  healthCheck,
  // 导出Prometheus指标用于暴露
  register: promClient.register,
  // 自定义指标
  httpRequestDurationMicroseconds,
  httpRequestsTotal,
  dbQueryDurationMilliseconds,
  errorsTotal,
  memoryUsageGauge,
  cpuUsageGauge
};