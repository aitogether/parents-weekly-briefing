const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');

// 扫码类型常量（与 common/constants.js 保持一致）
const QR_TYPE = {
  MEDICINE: 'medicine',
  FOOD: 'food',
  PRODUCT: 'product'
};

/**
 * 扫码帮手云函数
 *
 * 场景：父母扫描药品/食品/商品二维码，记录扫描历史
 * 子女端可查看父母最近扫描了哪些物品（关注用药安全、食品健康）
 *
 * 设计原则：
 * - 非诊断：仅记录，不判断药品是否合理
 * - 隐私保护：扫描历史保留30天
 * - 去重：同一天同一二维码只保留最新一次
 */

exports.main = async (event, context) => {
  const db = getDB(cloud);
  const { action } = event;

  switch (action) {
    // ==================== 扫码记录 ====================
    case 'scan': {
      const { parent_id, qr_type, qr_value } = event;

      // 参数验证
      if (!parent_id) return R.fail('parent_id required');
      if (!qr_type) return R.fail('qr_type required');
      if (!qr_value) return R.fail('qr_value required');

      // 类型校验
      const validTypes = [QR_TYPE.MEDICINE, QR_TYPE.FOOD, QR_TYPE.PRODUCT];
      if (!validTypes.includes(qr_type)) {
        return R.fail('qr_type must be medicine|food|product');
      }

      // 长度限制（防刷）
      if (qr_value.length > 500) {
        return R.fail('qr_value too long (max 500)');
      }

      try {
        const record = await db.scanQRCode({ parent_id, qr_type, qr_value });
        return R.ok({ scan: record });
      } catch (err) {
        console.error('[qrscan] scan error:', err);
        return R.fail('scan failed: ' + err.message);
      }
    }

    // ==================== 查询历史 ====================
    case 'history': {
      const { parent_id, days = 30 } = event;

      if (!parent_id) return R.fail('parent_id required');
      const daysNum = parseInt(days, 10);
      if (isNaN(daysNum) || daysNum <= 0 || daysNum > 90) {
        return R.fail('days must be 1-90');
      }

      try {
        const scans = await db.getQRScans(parent_id, daysNum);

        // 按类型分组统计
        const stats = {
          medicine: scans.filter(s => s.qr_type === QR_TYPE.MEDICINE).length,
          food: scans.filter(s => s.qr_type === QR_TYPE.FOOD).length,
          product: scans.filter(s => s.qr_type === QR_TYPE.PRODUCT).length
        };

        return R.ok({
          scans,
          count: scans.length,
          stats,
          period_days: daysNum
        });
      } catch (err) {
        console.error('[qrscan] history error:', err);
        return R.fail('query failed: ' + err.message);
      }
    }

    // ==================== 删除记录 ====================
    case 'delete': {
      const { scan_id } = event;
      if (!scan_id) return R.fail('scan_id required');

      try {
        await db.collection('qr_scans').doc(scan_id).remove();
        return R.ok({ deleted: true });
      } catch (err) {
        console.error('[qrscan] delete error:', err);
        return R.fail('delete failed');
      }
    }

    default:
      return R.fail('unknown action: ' + action);
  }
};
