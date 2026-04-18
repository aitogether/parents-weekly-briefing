const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');
const { TAXI_STATUS } = require('../common/constants');

/**
 * 叫车帮手云函数
 *
 * 场景：父母需要出行时，记录叫车需求
 * 子女端可查看父母出行记录，确保安全
 *
 * 设计原则：
 * - 非实时派单：仅记录需求，不直接叫车（避免第三方依赖）
 * - 轻量操作：父母只需填写目的地
 * - 状态可追溯：pending → assigned → completed
 */

exports.main = async (event, context) => {
  const db = getDB(cloud);
  const { action } = event;

  switch (action) {
    // ==================== 创建叫车请求 ====================
    case 'createRequest': {
      const { parent_id, destination, scheduled_time, notes } = event;

      if (!parent_id) return R.fail('parent_id required');
      if (!destination || destination.trim().length === 0) {
        return R.fail('destination required');
      }

      try {
        const request = await db.createTaxiRequest({
          parent_id,
          destination: destination.trim().substring(0, 200),  // 限制长度
          scheduled_time,
          notes: (notes || '').trim().substring(0, 500)
        });
        return R.ok({ request });
      } catch (err) {
        console.error('[taxi] create error:', err);
        return R.fail('create failed: ' + err.message);
      }
    }

    // ==================== 获取请求列表 ====================
    case 'getRequests': {
      const { parent_id, status, limit = 20 } = event;

      if (!parent_id) return R.fail('parent_id required');

      const limitNum = Math.min(parseInt(limit, 10) || 20, 50);  // 最多50条

      try {
        const requests = await db.getTaxiRequests(parent_id, status, limitNum);
        return R.ok({
          requests,
          count: requests.length,
          filter: { status: status || 'all' }
        });
      } catch (err) {
        console.error('[taxi] get requests error:', err);
        return R.fail('query failed: ' + err.message);
      }
    }

    // ==================== 更新请求状态 ====================
    case 'updateStatus': {
      const { request_id, status, notes } = event;

      if (!request_id || !status) return R.fail('request_id and status required');

      const validStatus = [TAXI_STATUS.PENDING, TAXI_STATUS.ASSIGNED, TAXI_STATUS.COMPLETED, TAXI_STATUS.CANCELLED];
      if (!validStatus.includes(status)) {
        return R.fail('invalid status');
      }

      try {
        const updated = await db.updateTaxiStatus(request_id, status, notes);
        return R.ok({ request: updated });
      } catch (err) {
        console.error('[taxi] update status error:', err);
        return R.fail('update failed');
      }
    }

    // ==================== 获取统计 ====================
    case 'stats': {
      const { parent_id, days = 30 } = event;

      if (!parent_id) return R.fail('parent_id required');

      const daysNum = Math.min(parseInt(days, 10) || 30, 90);

      try {
        const stats = await db.getTaxiStats(parent_id, daysNum);
        return R.ok({ stats, period_days: daysNum });
      } catch (err) {
        console.error('[taxi] stats error:', err);
        return R.fail('stats failed');
      }
    }

    default:
      return R.fail('unknown action: ' + action);
  }
};
