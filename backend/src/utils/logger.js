const winston = require('winston');
const { combine, timestamp, printf, colorize, errors } = winston.format;

// 敏感信息脱敏函数
function sanitizeSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = [
    'password', 'token', 'key', 'secret', 'credential',
    'parent_id', 'child_id', // 在日志中脱敏
    'authorization', 'cookie'
  ];

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSensitiveData(item));
  }

  const sanitized = { ...obj };
  for (const field of sensitiveFields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      if (field === 'parent_id' || field === 'child_id') {
        // 保留前4位，其余用*代替
        const original = sanitized[field];
        sanitized[field] = original.substring(0, 4) + '*'.repeat(Math.max(0, original.length - 4));
      } else {
        // 其他敏感字段用***代替
        sanitized[field] = '***';
      }
    }
  }

  // 递归处理嵌套对象
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
}

// 自定义格式化
const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  const sanitizedMetadata = sanitizeSensitiveData(metadata);
  const logEntry = {
    timestamp,
    level,
    message
  };

  if (Object.keys(sanitizedMetadata).length > 0) {
    logEntry.metadata = sanitizedMetadata;
  }

  if (stack) {
    logEntry.stack = stack;
  }

  return JSON.stringify(logEntry);
});

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    customFormat
  ),
  defaultMeta: { service: 'parents-weekly-briefing-backend' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      )
    })
  ]
});

// 文件传输器（可选，用于生产环境）
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      customFormat
    )
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      customFormat
    )
  }));
}

// 请求日志中间件
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      response_time_ms: duration,
      user_agent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    // 记录访问日志
    logger.info('HTTP Request', logData);

    return originalSend.call(this, data);
  };

  next();
};

// 错误日志包装器
function logError(error, context = {}) {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context
  };

  logger.error('Application Error', errorLog);
}

// 业务操作日志
function logBusinessOperation(action, data = {}, metadata = {}) {
  const businessLog = {
    action,
    data: sanitizeSensitiveData(data),
    metadata,
    timestamp: new Date().toISOString()
  };

  logger.info('Business Operation', businessLog);
}

// 性能监控日志
function logPerformance(metric, value, unit = 'ms', tags = {}) {
  const perfLog = {
    metric,
    value,
    unit,
    tags,
    timestamp: new Date().toISOString()
  };

  logger.info('Performance Metric', perfLog);
}

module.exports = {
  logger,
  requestLogger,
  logError,
  logBusinessOperation,
  logPerformance,
  sanitizeSensitiveData
};