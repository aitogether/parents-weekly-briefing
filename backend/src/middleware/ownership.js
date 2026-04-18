/**
 * 资源所有权校验中间件（P1-4 安全核心）
 *
 * 规则：
 * 1. 用户只能访问自己的数据 (user.id === resource.user_id)
 * 2. 子女用户可以访问已绑定父母的数据 (user.bound_to包含parent_id)
 * 3. 父母用户只能访问自己的数据（不能访问子女数据）
 *
 * 使用方法：
 *   router.get('/:id', authMiddleware, ownershipCheck('user_id'), handler)
 *   router.post('/', authMiddleware, ownershipCheck('parent_id', 'create'), handler)
 */

const { getDB } = require('../db/encryption-enabled');

/**
 * 所有权校验中间件工厂
 * @param {string} paramName - URL参数或body字段名（资源所有者ID）
 * @param {string} [action='read'] - 操作类型：'read' | 'create' | 'update' | 'delete'
 */
function ownershipCheck(paramName, action = 'read') {
  return (req, res, next) => {
    const db = getDB();
    const requester = req.user; // { id, role, bound_to }

    // 获取目标资源所有者ID
    let targetOwnerId = null;
    if (req.method === 'GET' || req.method === 'DELETE') {
      targetOwnerId = req.query[paramName] || req.params[paramName];
    } else { // POST, PUT, PATCH
      targetOwnerId = req.body[paramName];
    }

    if (!targetOwnerId) {
      return res.status(400).json({ error: `缺少参数: ${paramName}` });
    }

    // 规则1：用户访问自己的数据 → 直接放行
    if (requester.id === targetOwnerId) {
      return next();
    }

    // 规则2：子女访问绑定的父母数据
    if (requester.role === 'child' && requester.bound_to) {
      const boundParents = Array.isArray(requester.bound_to)
        ? requester.bound_to
        : [requester.bound_to];

      if (boundParents.includes(targetOwnerId)) {
        return next();
      }
    }

    // 规则3：父母访问他人数据 → 拒绝
    // 父母role不能访问任何其他人的数据（包括子女数据）
    if (requester.role === 'parent') {
      return res.status(403).json({
        error: '父母用户只能访问自己的数据',
        code: 'PARENT_CROSS_ACCESS_DENIED'
      });
    }

    // 未匹配任何规则 → 拒绝
    return res.status(403).json({
      error: '无权访问该资源',
      code: 'OWNERSHIP_CHECK_FAILED',
      requester_id: requester.id,
      requester_role: requester.role,
      target_owner: targetOwnerId
    });
  };
}

/**
 * 批量所有权校验（用于列表接口）
 * 确保查询结果只包含用户有权访问的记录
 * 注意：此函数需要在数据库查询后、返回前调用
 */
function filterByOwnership(requester, resources, ownerKey = 'user_id') {
  if (!Array.isArray(resources)) {
    return resources; // 单条记录由ownershipCheck处理
  }

  return resources.filter(resource => {
    const ownerId = resource[ownerKey];

    // 自己的数据 always included
    if (requester.id === ownerId) return true;

    // 子女可访问绑定的父母数据
    if (requester.role === 'child' && requester.bound_to) {
      const boundParents = Array.isArray(requester.bound_to)
        ? requester.bound_to
        : [requester.bound_to];
      return boundParents.includes(ownerId);
    }

    return false;
  });
}

module.exports = { ownershipCheck, filterByOwnership };
