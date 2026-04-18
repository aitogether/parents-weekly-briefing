const cloud = require('wx-server-sdk');
const { getDB } = require('../common/db');

// ═══════════════════════════════════════════════════════════════════════════════
// 合规声明
// ═══════════════════════════════════════════════════════════════════════════════
// 本产品不构成医疗建议。数据仅用于家庭关怀。紧急情况请拨打 120。
// 本云函数仅执行情绪记录功能，不涉及：
//   - 心理诊断或情绪评估
//   - 疾病预测或风险分析
//   - 推荐治疗方案
//   - 替代子女决策
//   - 医疗数据监测
// ═══════════════════════════════════════════════════════════════════════════════

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

/**
 * 获取周起始日期（周一）
 * @param {Date|string} date - 日期对象或YYYY-MM-DD字符串
 * @returns {string} YYYY-MM-DD格式的周起始日期
 */
function getWeekStart(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay() || 7; // 周日=7，周一=1
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * 获取周结束日期（周日）
 * @param {string} weekStart - YYYY-MM-DD格式的周起始日期
 * @returns {string} YYYY-MM-DD格式的周结束日期
 */
function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

/**
 * 情绪日志云函数主入口
 *
 * 支持的 action:
 *   - log: 记录情绪日志（去重更新）
 *   - history: 查询情绪历史（按parent_id，倒序）
 *
 * @param {Object} event - 事件参数
 * @param {string} event.action - 操作类型
 * @param {string} event.parent_id - 父母用户ID（log/history都需要）
 * @param {number} [event.weeks] - 查询周数（history用，默认4）
 * @param {string} [event.week_start] - 周起始日期（log用）
 * @param {number} event.emotion_level - 情绪等级 1-5（log用）
 * @param {string} [event.child_id] - 子女用户ID（log用，可选）
 * @returns {Promise<Object>} 标准响应格式
 */
exports.main = async (event, context) => {
  const { action, parent_id, weeks, week_start, emotion_level, child_id } = event;

  // ── 参数校验 ──
  if (!action) {
    return { success: false, error: '缺少action参数' };
  }

  // ── 查询历史 ──
  if (action === 'history') {
    if (!parent_id) {
      return { success: false, error: 'parent_id为必填参数' };
    }

    const limit = Math.min(weeks || 4, 52); // 最多52周

    try {
      const result = await db.collection('emotion_logs')
        .where({ parent_id })
        .orderBy('week_start', 'desc')
        .limit(limit)
        .get();

      const data = (result.data || []).map(log => ({
        _id: log._id,
        parent_id: log.parent_id,
        child_id: log.child_id,
        emotion_level: log.emotion_level,
        emotion_emoji: log.emotion_emoji,
        week_start: log.week_start,
        week_end: log.week_end,
        recorded_at: log.recorded_at,
        created_at: log.created_at
      }));

      return {
        success: true,
        data,
        total: data.length
      };
    } catch (err) {
      console.error('[EmotionLog] 查询历史失败', err);
      return {
        success: false,
        error: '查询失败',
        code: 'DB_ERROR'
      };
    }
  }

  // ── 记录情绪 ──
  if (action === 'log') {
    if (!parent_id) {
      return { success: false, error: 'parent_id为必填参数' };
    }
    if (typeof emotion_level !== 'number' || emotion_level < 1 || emotion_level > 5) {
      return { success: false, error: 'emotion_level必须为1-5的整数' };
    }

    // 计算周范围
    const weekStart = week_start || getWeekStart(new Date());
    const weekEnd = getWeekEnd(weekStart);

    // 验证weekStart格式
    const weekStartRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!weekStartRegex.test(weekStart)) {
      return { success: false, error: 'week_start格式错误，应为YYYY-MM-DD' };
    }

    // 情绪映射
    const EMOJI_MAP = {
      1: '😊', // 积极
      2: '😐', // 一般
      3: '😢', // 低落
      4: '😠', // 烦躁
      5: '😰'  // 焦虑
    };
    const emoji = EMOJI_MAP[emotion_level];

    try {
      const now = new Date();

      // 去重处理：删除同一周旧记录（保证每周仅保留最新记录）
      await db.collection('emotion_logs')
        .where({
          parent_id,
          week_start: weekStart
        })
        .remove()
        .catch(() => {
          // 记录不存在是正常情况，忽略错误
        });

      // 插入新记录
      const record = {
        parent_id,
        child_id: child_id || null,
        emotion_level,
        emotion_emoji: emoji,
        week_start: weekStart,
        week_end: weekEnd,
        recorded_at: now.toISOString(),
        client_ip: null,
        created_at: db.serverDate(),
        updated_at: db.serverDate()
      };

      const result = await db.collection('emotion_logs').add({ data: record });

      return {
        success: true,
        data: {
          emotion_log_id: result._id,
          emotion_level,
          emotion_emoji: emoji,
          week_start: weekStart,
          week_end: weekEnd
        }
      };
    } catch (err) {
      console.error('[EmotionLog] 记录失败', err);
      return {
        success: false,
        error: '数据库操作失败，请重试',
        code: 'DB_ERROR'
      };
    }
  }

  // ── 未知action ──
  return { success: false, error: '未知的action参数' };
};
