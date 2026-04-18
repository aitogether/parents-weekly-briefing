/**
 * 用户数据管理路由（P1-2 GDPR/PIPL 数据权利）
 *
 * 功能：
 * - GET /api/v1/user/data-export：导出用户所有数据（JSON格式）
 * - POST /api/v1/user/delete：删除/匿名化用户数据
 *
 * 安全要求：
 * - 所有端点需 JWT 认证
 * - 用户只能操作自己的数据
 * - 删除支持硬删除（彻底删除）或匿名化（保留统计用）
 */

const express = require('express');
const { getDB } = require('../db/encryption-enabled');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/v1/user/data-export
 * 导出当前用户的全部数据（GDPR/PIPL 数据可携带权）
 */
router.get('/data-export', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;

    // 使用统一方法获取全部数据
    const userData = db.getAllUserData(userId);
    if (!userData) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 添加导出元数据
    const exportMeta = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      format_version: '1.0'
    };

    res.json({
      success: true,
      meta: exportMeta,
      data: userData
    });

  } catch (err) {
    console.error('[DataExport] 导出失败:', err);
    res.status(500).json({ error: '数据导出失败' });
  }
});

/**
 * POST /api/v1/user/delete
 * 删除或匿名化用户数据
 *
 * 请求体：
 * {
 *   "mode": "hard" | "anonymize"  // hard: 硬删除彻底删除；anonymize: 匿名化保留统计
 * }
 */
router.post('/delete', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.id;
    const { mode = 'anonymize' } = req.body;

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (mode === 'hard') {
      // 硬删除：彻底删除所有数据（级联删除会自动处理关联数据）
      // better-sqlite3 的级联删除会在删除用户时自动清理关联记录
      const success = db.hardDeleteUser(userId);
      if (!success) {
        return res.status(500).json({ error: '硬删除失败' });
      }

      console.log(`[DataDelete] 用户 ${userId} 已硬删除（彻底删除）`);
      res.json({
        success: true,
        message: '用户数据已彻底删除',
        mode: 'hard'
      });

    } else if (mode === 'anonymize') {
      // 匿名化：保留统计信息，但清除个人身份信息
      const success = db.anonymizeUser(userId);
      if (!success) {
        return res.status(500).json({ error: '匿名化失败' });
      }

      console.log(`[DataDelete] 用户 ${userId} 已匿名化（保留统计）`);
      res.json({
        success: true,
        message: '用户数据已匿名化（保留统计用）',
        mode: 'anonymize'
      });

    } else {
      return res.status(400).json({ error: 'mode 必须为 "hard" 或 "anonymize"' });
    }

  } catch (err) {
    console.error('[DataDelete] 删除失败:', err);
    res.status(500).json({ error: '数据删除失败' });
  }
});

module.exports = router;
