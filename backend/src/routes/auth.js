/**
 * 认证路由 — 微信登录 + 角色注册（JWT 重构版）
 *
 * 改动：
 * - 登录返回 JWT token（有效期7天）
 * - 所有端点使用 JWT 验证而非 user.id
 * - 支持登出（黑名单 token）
 */

const express = require('express');
const { getDB } = require('../db/encryption-enabled');
const { code2session } = require('../auth/wechat');
const {
  generateToken,
  blacklistToken,
  authMiddleware,
  roleMiddleware
} = require('../middleware/auth');

const router = express.Router();

// POST /auth/login — 微信登录
// 入参: { code, role, nickname }
// 出参: { token, user, expires_in }
router.post('/login', async (req, res) => {
  const { code, role, nickname } = req.body;

  if (!role || !['child', 'parent'].includes(role)) {
    return res.status(400).json({ error: 'role must be "child" or "parent"' });
  }
  if (!code) {
    return res.status(400).json({ error: 'code is required (from wx.login())' });
  }

  try {
    // 调用微信 code2session（或 mock 降级）
    const session = await code2session(code);
    const open_id = session.open_id;

    const db = getDB();
    let user = db.getUserByOpenId(open_id);

    if (!user) {
      user = db.createUser({ open_id, role, nickname });
      console.log(`[Auth] 新用户注册: ${user.id} (${role})`); // 已清理 open_id
    }

    // 生成 JWT token
    const token = generateToken(user);

    res.json({
      token,
      expires_in: 7 * 24 * 3600, // 7天（秒）
      user: {
        id: user.id,
        role: user.role,
        nickname: user.nickname,
        invite_code: user.invite_code,
        bound_to: user.bound_to
      }
    });
  } catch (err) {
    console.error('[Auth] 登录失败:', err.message);
    res.status(500).json({ error: '登录失败: ' + err.message });
  }
});

// POST /auth/logout — 登出（将token加入黑名单）
router.post('/logout', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.slice(7);
  blacklistToken(token);

  res.json({ success: true, message: '已登出' });
});

// GET /auth/profile — 获取当前用户信息（需要认证）
router.get('/profile', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.getUserById(req.user.id);

  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }

  const result = {
    id: user.id,
    role: user.role,
    nickname: user.nickname,
    invite_code: user.invite_code,
    bound_to: user.bound_to
  };

  if (user.role === 'child' && user.bound_to) {
    const parent = db.getUserById(user.bound_to);
    if (parent) result.parent = { id: parent.id, nickname: parent.nickname };
  }

  if (user.role === 'parent' && Array.isArray(user.bound_to)) {
    result.children = user.bound_to
      .map(cid => db.getUserById(cid))
      .filter(Boolean)
      .map(c => ({ id: c.id, nickname: c.nickname }));
  }

  res.json(result);
});

// POST /auth/bind — 子女通过邀请码绑定父母（需要认证，仅子女）
router.post('/bind', authMiddleware, roleMiddleware(['child']), (req, res) => {
  const db = getDB();
  const user = db.getUserById(req.user.id);

  const { invite_code } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'invite_code required' });

  const parent = db.getParentByInviteCode(invite_code.toUpperCase());
  if (!parent) return res.status(404).json({ error: '邀请码无效，请向父母确认' });

  const result = db.bindChildToParent(user.id, parent.id);
  if (!result) return res.status(500).json({ error: '绑定失败' });

  console.log(`[Auth] 绑定成功: 子女 ${user.id} → 父母 ${parent.id}`); // 仅记录ID，不包含敏感信息

  res.json({
    success: true,
    parent: { id: parent.id, nickname: parent.nickname }
  });
});

// POST /auth/seed-parent — 快速创建测试父母用户（仅开发用，不需要认证但应限制）
router.post('/seed-parent', (req, res) => {
  const { nickname } = req.body;
  const db = getDB();
  const open_id = `mock_parent_${Date.now()}`;
  const user = db.createUser({ open_id, role: 'parent', nickname: nickname || '妈妈' });
  console.log(`[Auth] 测试父母创建: ${user.id} 邀请码: ${user.invite_code}`); // mock用户，邀请码可记录
  res.json({
    success: true,
    user: { id: user.id, nickname: user.nickname, invite_code: user.invite_code }
  });
});

module.exports = router;
