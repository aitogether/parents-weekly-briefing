/**
 * 简单 Bearer token 验证中间件
 *
 * 用法：在 app.js 中挂载到需要保护的路由
 *   const auth = require('./middleware/auth');
 *   app.use('/v1', auth);
 *
 * Token 来源：环境变量 AUTH_TOKEN，未设置时跳过验证（开发模式）
 */
function authMiddleware(req, res, next) {
  const expectedToken = process.env.AUTH_TOKEN;

  // 未配置 token 则跳过（方便开发调试）
  if (!expectedToken) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  if (token !== expectedToken) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next();
}

module.exports = authMiddleware;
