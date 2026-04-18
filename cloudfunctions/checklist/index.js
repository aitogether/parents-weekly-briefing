const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');

// 获取本周一日期（YYYY-MM-DD）
function getWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = getDB(cloud);
  const { action, user_id, item_id, notes, limit } = event;

  // 获取当前用户信息
  const user = await db.getUserByOpenId(OPENID);
  if (!user) return R.fail('未登录', 401);

  // 确定操作的user_id（默认为当前用户）
  const targetUserId = user_id || user._id;
  // 仅允许操作自己的数据（除非是管理员，暂不实现复杂RBAC）
  if (targetUserId !== user._id && user.role !== 'child') {
    return R.fail('无权限操作其他用户数据', 403);
  }

  switch (action) {
    case 'getWeekly': {
      const weekStart = event.week_start || getWeekStart();
      const items = await db.getWeeklyChecklist(targetUserId, weekStart);
      return R.ok({
        week_start: weekStart,
        items,
        completed_count: items.filter(i => i.completed).length,
        total_count: items.length
      });
    }

    case 'complete': {
      if (!item_id) return R.fail('item_id required');
      const weekStart = event.week_start || getWeekStart();
      const result = await db.completeChecklistItem(targetUserId, weekStart, item_id, notes || '');
      return R.ok({ completed: result.changes > 0 });
    }

    case 'history': {
      const limitVal = limit || 4;
      const weeks = await db.getChecklistHistory(targetUserId, limitVal);
      return R.ok({ weeks });
    }

    default:
      return R.fail('unknown action: ' + action);
  }
};
