/**
 * 日志清理中间件（P1-5 日志敏感信息清理）
 *
 * 功能：
 * - 自动拦截响应中的敏感信息（PII）
 * - 提供安全的日志记录方法
 * - 清理 req/res 对象中的敏感字段
 *
 * 敏感字段清单：
 * - user.id, user.open_id, user.nickname
 * - phone, mobile
 * - 身份证号、地址等个人身份信息
 */

const sensitivePatterns = [
  // 用户ID相关
  { pattern: /user\.id[=:]\s*['"]([^'"]+)['"]/g, replacement: 'user.id="[REDACTED]"' },
  { pattern: /user_id[=:]\s*['"]([^'"]+)['"]/g, replacement: 'user_id="[REDACTED]"' },
  { pattern: /uid[=:]\s*['"]([^'"]+)['"]/g, replacement: 'uid="[REDACTED]"' },

  // OpenID
  { pattern: /open_id[=:]\s*['"]([^'"]+)['"]/g, replacement: 'open_id="[REDACTED]"' },
  { pattern: /openid[=:]\s*['"]([^'"]+)['"]/g, replacement: 'openid="[REDACTED]"' },

  // 昵称/姓名
  { pattern: /nickname[=:]\s*['"]([^'"]+)['"]/g, replacement: 'nickname="[REDACTED]"' },
  { pattern: /name[=:]\s*['"]([^'"]+)['"]/g, replacement: 'name="[REDACTED]"' },
  { pattern: /username[=:]\s*['"]([^'"]+)['"]/g, replacement: 'username="[REDACTED]"' },

  // 手机号
  { pattern: /phone[=:]\s*['"]([^'"]+)['"]/g, replacement: 'phone="[REDACTED]"' },
  { pattern: /mobile[=:]\s*['"]([^'"]+)['"]/g, replacement: 'mobile="[REDACTED]"' },
  { pattern: /tel[=:]\s*['"]([^'"]+)['"]/g, replacement: 'tel="[REDACTED]"' },

  // 邀请码
  { pattern: /invite_code[=:]\s*['"]([^'"]+)['"]/g, replacement: 'invite_code="[REDACTED]"' },
  { pattern: /inviteCode[=:]\s*['"]([^'"]+)['"]/g, replacement: 'inviteCode="[REDACTED]"' },

  // 身份证
  { pattern: /id_card[=:]\s*['"]([^'"]+)['"]/g, replacement: 'id_card="[REDACTED]"' },
  { pattern: /idcard[=:]\s*['"]([^'"]+)['"]/g, replacement: 'idcard="[REDACTED]"' },

  // 地址
  { pattern: /address[=:]\s*['"]([^'"]+)['"]/g, replacement: 'address="[REDACTED]"' },

  // 邮箱
  { pattern: /email[=:]\s*['"]([^'"]+)['"]/g, replacement: 'email="[REDACTED]"' }
];

/**
 * 清理字符串中的敏感信息
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const { pattern, replacement } of sensitivePatterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * 深度清理对象中的敏感字段
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > 5) return obj; // 防止无限递归

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // 检查键名是否敏感
      const isSensitiveKey = [
        'id', 'user_id', 'uid', 'open_id', 'openid',
        'nickname', 'name', 'username',
        'phone', 'mobile', 'tel',
        'invite_code', 'inviteCode',
        'id_card', 'idcard',
        'address', 'email'
  ].includes(key.toLowerCase());

      if (isSensitiveKey && typeof value === 'string') {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        cleaned[key] = sanitizeObject(value, depth + 1);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * 日志清理中间件
 * 在请求结束后清理响应中的敏感信息
 */
function logSanitizer(req, res, next) {
  // 保存原始的 json 方法
  const originalJson = res.json;

  // 重写 res.json 方法，在发送前清理敏感数据
  res.json = function(data) {
    const sanitized = sanitizeObject(data);
    return originalJson.call(this, sanitized);
  };

  next();
}

/**
 * 安全日志记录函数（替代 console.log）
 */
function safeLog(level, message, ...args) {
  const sanitizedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return sanitizeString(arg);
    }
    if (typeof arg === 'object') {
      return sanitizeObject(arg);
    }
    return arg;
  });

  const logPrefix = `[${level.toUpperCase()}]`;
  console.log(logPrefix, message, ...sanitizedArgs);
}

/**
 * 安全错误记录函数（替代 console.error）
 */
function safeError(message, ...args) {
  safeLog('ERROR', message, ...args);
}

module.exports = {
  logSanitizer,
  sanitizeString,
  sanitizeObject,
  safeLog,
  safeError
};
