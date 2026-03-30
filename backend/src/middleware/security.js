/**
 * 安全中间件集合（P1-6）
 *
 * 1. rateLimit — 简易请求频率限制
 * 2. sanitizeBody — 清洗请求体中的 XSS
 * 3. httpsRedirect — 强制 HTTPS（生产环境）
 */

// ── 简易 Rate Limiter（内存版） ──
const requestCounts = new Map(); // ip -> { count, resetAt }
const WINDOW_MS = 60 * 1000;    // 1 分钟窗口
const MAX_REQUESTS = 120;       // 每分钟最多 120 次

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  let entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    requestCounts.set(ip, entry);
  } else {
    entry.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - entry.count));

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many requests',
      retry_after: Math.ceil((entry.resetAt - now) / 1000)
    });
  }

  next();
}

// ── XSS 清洗 ──
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }
    }
  }
  next();
}

// ── HTTPS 强制重定向（仅生产环境） ──
function httpsRedirect(req, res, next) {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}

// ── 安全响应头 ──
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

module.exports = { rateLimit, sanitizeBody, httpsRedirect, securityHeaders };
