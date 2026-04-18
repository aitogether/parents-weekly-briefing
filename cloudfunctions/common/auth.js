/**
 * 权限校验工具（P1 任务4 基础）
 *
 * 角色定义：
 * - child: 子女，可以查看父母数据、提交反馈、查看周报
 * - parent: 父母，可以确认用药、填写清单
 *
 * 权限检查函数返回：{ allowed: boolean, reason?: string }
 */

const ROLES = {
  CHILD: 'child',
  PARENT: 'parent'
};

/**
 * 检查用户是否拥有指定角色
 */
function hasRole(user, allowedRoles) {
  if (!user) return { allowed: false, reason: '未登录' };
  if (!Array.isArray(allowedRoles)) allowedRoles = [allowedRoles];
  if (!allowedRoles.includes(user.role)) {
    return { allowed: false, reason: `需要 ${allowedRoles.join('或')} 角色，当前是 ${user.role}` };
  }
  return { allowed: true };
}

/**
 * 检查用户是否可以访问目标用户的数据
 * 规则：
 * - 用户可以访问自己的数据
 * - 子女可以访问其绑定父母的数据（通过parent_id判断）
 * - 父母可以访问其绑定子女的数据（通过child_id判断）
 */
function canAccessData(actor, targetUserId, db) {
  if (!actor) return { allowed: false, reason: '未登录' };

  // 自己的数据总是可访问
  if (actor._id === targetUserId) return { allowed: true };

  // 子女访问父母数据：需要绑定关系
  if (actor.role === ROLES.CHILD) {
    const boundTo = actor.bound_to;
    const parentIds = Array.isArray(boundTo) ? boundTo : (boundTo ? [boundTo] : []);
    if (parentIds.includes(targetUserId)) return { allowed: true };
    return { allowed: false, reason: '无权访问该用户数据' };
  }

  // 父母访问子女数据：需要绑定关系（父母bound_to是子女ID数组）
  if (actor.role === ROLES.PARENT) {
    const boundTo = actor.bound_to || [];
    const childIds = Array.isArray(boundTo) ? boundTo : [];
    if (childIds.includes(targetUserId)) return { allowed: true };
    return { allowed: false, reason: '无权访问该用户数据' };
  }

  return { allowed: false, reason: '未知角色' };
}

/**
 * 中间件风格：云函数中直接调用
 * 示例：
 *   const auth = require('../common/auth');
 *   const { allowed, reason } = auth.requireRole(event, user, ['parent']);
 *   if (!allowed) return R.fail(reason, 403);
 */
function requireRole(event, user, allowedRoles) {
  const check = hasRole(user, allowedRoles);
  if (!check.allowed) {
    return { pass: false, error: check.reason };
  }
  return { pass: true };
}

/**
 * 检查对目标用户数据的访问权限
 */
function requireDataAccess(user, targetUserId, db) {
  const check = canAccessData(user, targetUserId, db);
  if (!check.allowed) {
    return { pass: false, error: check.reason };
  }
  return { pass: true };
}

module.exports = {
  ROLES,
  hasRole,
  canAccessData,
  requireRole,
  requireDataAccess
};
