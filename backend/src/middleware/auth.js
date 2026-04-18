/**
 * JWT认证中间件（P0 重构版本）
 *
 * 特性：
 * - 使用 jsonwebtoken 替代简单的 user.id 验证
 * - Token 有效期 7 天
 * - 支持黑名单登出（内存存储，生产环境建议改用 Redis）
 * - 自动验证 token 有效性并设置 req.user
 */

const jwt = require('jsonwebtoken');
const { getDB } = require('../db/encryption-enabled');

// 从环境变量读取JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_EXPIRE_DAYS = 7;

// 内存黑名单（生产环境应使用Redis）
// 结构: Map<token, expiry_timestamp>
const tokenBlacklist = new Map();

/**
 * 生成JWT token
 */
function generateToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    open_id: user.open_id
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${TOKEN_EXPIRE_DAYS}d` });
}

/**
 * 验证JWT token并返回解码的payload
 * 检查黑名单和过期时间
 */
function verifyToken(token) {
  // 检查黑名单
  if (tokenBlacklist.has(token)) {
    const expiry = tokenBlacklist.get(token);
    if (expiry > Date.now()) {
      return null; // token仍在黑名单有效期内
    } else {
      tokenBlacklist.delete(token); // 过期后清理
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * 将token加入黑名单（登出）
 */
function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      // 设置黑名单到token过期时间之后一点
      const expiry = decoded.exp * 1000 + 60000; // 加1分钟缓冲
      tokenBlacklist.set(token, expiry);
      return true;
    }
  } catch (err) {
    // 无法解码的token，直接加入短期黑名单
    tokenBlacklist.set(token, Date.now() + 3600000); // 1小时
  }
  return true;
}

/**
 * 认证中间件
 * 验证Authorization头中的Bearer token
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: '无效或过期的认证令牌' });
  }

  // 从数据库获取完整用户信息
  const db = getDB();
  const user = db.getUserById(payload.sub);

  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }

  // 将用户信息挂载到req对象
  req.user = {
    id: user.id,
    role: user.role,
    nickname: user.nickname,
    open_id: user.open_id,
    invite_code: user.invite_code,
    bound_to: user.bound_to
  };

  next();
}

/**
 * 可选认证中间件
 * 如果提供了有效token则设置req.user，否则不拦截（用于非必需认证的路由）
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (payload) {
      const db = getDB();
      const user = db.getUserById(payload.sub);
      if (user) {
        req.user = {
          id: user.id,
          role: user.role,
          nickname: user.nickname,
          open_id: user.open_id,
          invite_code: user.invite_code,
          bound_to: user.bound_to
        };
      }
    }
  }

  next();
}

/**
 * 角色检查中间件工厂
 * @param {string[]} allowedRoles - 允许访问的角色列表
 */
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '无权访问该资源' });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  roleMiddleware,
  generateToken,
  verifyToken,
  blacklistToken,
  JWT_SECRET,
  TOKEN_EXPIRE_DAYS,
  // 兼容性导出（实际实现已移至ownership.js）
  checkOwnership: require('./ownership').ownershipCheck
};
