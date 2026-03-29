/**
 * 认证路由 — 微信登录 + 角色注册
 * 支持：真实微信 code2session / 开发环境 mock 降级
 */
const express = require('express');
const { getDB } = require('../db/store');
const { code2session } = require('../auth/wechat');

const router = express.Router();

// POST /auth/login — 微信登录
// 入参: { code, role, nickname }
// 出参: { token, user }
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
      console.log(`[Auth] 新用户注册: ${user.id} (${role}) open_id=${open_id}`);
    }

    // 生产环境应使用 JWT，MVP 用 user.id
    const token = user.id;

    res.json({
      token,
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

// GET /auth/profile — 获取当前用户信息
router.get('/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });

  const db = getDB();
  const user = db.getUserById(token);
  if (!user) return res.status(401).json({ error: '用户不存在' });

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

// POST /auth/bind — 子女通过邀请码绑定父母
router.post('/bind', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });

  const db = getDB();
  const user = db.getUserById(token);
  if (!user) return res.status(401).json({ error: '用户不存在' });
  if (user.role !== 'child') return res.status(403).json({ error: '只有子女可以绑定父母' });

  const { invite_code } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'invite_code required' });

  const parent = db.getParentByInviteCode(invite_code.toUpperCase());
  if (!parent) return res.status(404).json({ error: '邀请码无效，请向父母确认' });

  const result = db.bindChildToParent(user.id, parent.id);
  if (!result) return res.status(500).json({ error: '绑定失败' });

  console.log(`[Auth] 绑定成功: 子女 ${user.id} → 父母 ${parent.id}`);

  res.json({
    success: true,
    parent: { id: parent.id, nickname: parent.nickname }
  });
});

// POST /auth/seed-parent — 快速创建测试父母用户（仅开发用）
router.post('/seed-parent', (req, res) => {
  const { nickname } = req.body;
  const db = getDB();
  const open_id = `mock_parent_${Date.now()}`;
  const user = db.createUser({ open_id, role: 'parent', nickname: nickname || '妈妈' });
  console.log(`[Auth] 测试父母创建: ${user.id} 邀请码: ${user.invite_code}`);
  res.json({
    success: true,
    user: { id: user.id, nickname: user.nickname, invite_code: user.invite_code }
  });
});

module.exports = router;
