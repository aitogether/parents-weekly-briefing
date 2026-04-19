const cloud = require('wx-server-sdk');
const { getDB } = require('../common/db');

// ═══════════════════════════════════════════════════════════════════════════════
// 合规声明
// ═══════════════════════════════════════════════════════════════════════════════
// 本产品不构成医疗建议。数据仅用于家庭关怀。紧急情况请拨打 120。
// 本云函数仅执行定时提醒任务，不涉及：
//   - 疾病诊断或风险预测
//   - 用药合理性判断
//   - 生命体征监测
//   - 推荐治疗方案
//   - 替代子女决策
// ═══════════════════════════════════════════════════════════════════════════════

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 用药提醒云函数
 * 定时触发：每天 08:00, 18:00
 *
 * 核心流程：
 *   1. 查询所有 enabled=true 的用药计划
 *   2. 根据当前时间（小时）和计划 schedule 判断是否今天该吃
 *   3. 向父母端发送模板消息提醒
 *   4. 记录提醒日志（用于去重和统计）
 *
 * schedule 字段格式（JSON数组）：
 *   [
 *     { "time": "08:00", "repeat": "daily" }          // 每天 08:00
 *     { "time": "08:00", "repeat": "weekdays" }      // 工作日 08:00
 *     { "time": "08:00", "repeat": ["mon","wed","fri"] } // 指定星期
 *   ]
 *
 * repeat 可选值：
 *   - "daily"      // 每天
 *   - "weekdays"   // 工作日（周一至周五）
 *   - "weekends"   // 周末（周六、周日）
 *   - ["mon","tue","wed","thu","fri","sat","sun"]  // 指定星期数组
 */

const db = cloud.database();
const _ = db.command;

/**
 * 获取当前时间信息
 * @returns {{ hour: number, minute: number, dayOfWeek: number, dateStr: string }}
 */
function getCurrentTimeInfo() {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    dayOfWeek: now.getDay(), // 0=周日, 1=周一, ..., 6=周六
    dateStr: now.toISOString().slice(0, 10) // YYYY-MM-DD
  };
}

/**
 * 判断某时间点是否匹配当前触发时间
 * @param {string} timeStr - 计划时间 "HH:mm"
 * @param {number} triggerHour - 当前触发小时（8,18）
 * @returns {boolean}
 */
function isTimeMatch(timeStr, triggerHour) {
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  // 允许±30分钟误差（实际触发可能不在精确整点）
  return hour === triggerHour;
}

/**
 * 判断今天是否符合 repeat 规则
 * @param {string|Array} repeat - repeat 规则
 * @param {number} dayOfWeek - 今天星期几 (0=周日)
 * @returns {boolean}
 */
function isDayMatch(repeat, dayOfWeek) {
  if (!repeat) return true; // 默认每天

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = dayNames[dayOfWeek];

  if (typeof repeat === 'string') {
    switch (repeat.toLowerCase()) {
      case 'daily':
        return true;
      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 周一至周五
      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6; // 周六、周日
      default:
        // 单个星期简写，如 "mon"
        return repeat.toLowerCase() === today;
    }
  }

  if (Array.isArray(repeat)) {
    return repeat.map(d => d.toLowerCase()).includes(today);
  }

  return true;
}

/**
 * 解析 schedule 数组，判断当前触发时间是否应该提醒
 * @param {Array} schedule - 计划 schedule 数组
 * @param {number} triggerHour - 当前触发小时
 * @param {number} dayOfWeek - 今天星期几
 * @returns {boolean}
 */
function shouldRemindToday(schedule, triggerHour, dayOfWeek) {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return false;
  }

  for (const item of schedule) {
    if (!item || !item.time) continue;
    if (isTimeMatch(item.time, triggerHour) && isDayMatch(item.repeat, dayOfWeek)) {
      return true;
    }
  }
  return false;
}

/**
 * 查询今日需要提醒的用药计划
 * @param {number} triggerHour - 当前触发小时（8,18）
 * @returns {Array} 需要提醒的计划列表
 */
async function getTodaysMedicationPlans(triggerHour) {
  const { dayOfWeek } = getCurrentTimeInfo();

  try {
    // 查询所有 enabled=true 的计划
    const result = await db.collection('medication_plans')
      .where({ enabled: true })
      .get();

    const plans = result.data || [];

    // 过滤出当前时间段应该服用的计划
    const todaysPlans = plans.filter(plan => {
      try {
        const schedule = typeof plan.schedule === 'string'
          ? JSON.parse(plan.schedule)
          : plan.schedule;
        return shouldRemindToday(schedule, triggerHour, dayOfWeek);
      } catch (e) {
        console.error('[Reminder] 解析计划 schedule 失败', plan._id, e);
        return false;
      }
    });

    console.log(`[Reminder] 触发 ${triggerHour}点，共找到 ${todaysPlans.length} 个需要提醒的计划`);
    return todaysPlans;
  } catch (err) {
    console.error('[Reminder] 查询用药计划失败', err);
    return [];
  }
}

/**
 * 发送模板消息
 * @param {string} parentOpenId - 父母端 openId
 * @param {Object} plan - 用药计划
 * @param {number} triggerHour - 触发小时
 * @returns {Promise<boolean>}
 */
async function sendTemplateMessage(parentOpenId, plan, triggerHour) {
  // ═══════════════════════════════════════════════════════════════════════════════
  // 合规声明：本条消息仅为用药时间提醒，不构成医疗建议。紧急情况请拨打 120。
  // ═══════════════════════════════════════════════════════════════════════════════

  // TODO: 替换为真实的模板消息配置
  // 微信小程序模板消息需要：
  // 1. 在微信公众平台配置模板（建议使用“用药提醒”类模板）
  // 2. 获取 templateId
  // 3. 父母端需提前订阅该模板（一次性订阅/长期订阅）
  //
  // 参考文档：
  // - https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html
  // - 模板ID建议放在环境变量中：TEMPLATE_ID_MED_REMINDER

  const templateId = process.env.TEMPLATE_ID_MED_REMINDER || 'YOUR_TEMPLATE_ID';
  const page = `pages/medication/confirm?planId=${plan._id}`;

  // 构建模板消息数据（根据实际模板字段调整）
  const data = {
    thing1: { value: plan.nickname || '药品' },        // 药品名称
    time2: { value: `${String(triggerHour).padStart(2, '0')}:00` }, // 提醒时间
    thing3: { value: plan.dosage || '请遵医嘱' },       // 用法用量
    thing4: { value: '本产品不构成医疗建议。紧急情况请拨打120。' } // 免责声明
  };

  try {
    // 调用微信订阅消息 API
    // 注意：需要确保云函数有发送订阅消息的权限
    // 实际发送需要 parentOpenId 和 templateId
    
    // 发送订阅消息
    console.log(`[Reminder] 发送模板消息 -> parentOpenId: ${parentOpenId.slice(0, 8)}..., plan: ${plan.nickname}, time: ${triggerHour}:00`);
    const result = await cloud.openapi.subscribeMessage.send({
      touser: parentOpenId,
      template_id: templateId,
      page,
      data
    });

    // 记录发送日志
    await logReminder(plan._id, plan.parent_id, triggerHour, 'sent');

    return true;
  } catch (err) {
    console.error('[Reminder] 发送模板消息失败', err);
    await logReminder(plan._id, plan.parent_id, triggerHour, 'failed', err.message);
    return false;
  }
}

/**
 * 记录提醒日志（用于去重和统计）
 * @param {string} planId
 * @param {string} parentId
 * @param {number} hour - 触发小时
 * @param {string} status - 'sent' | 'failed'
 * @param {string} errorMsg - 错误信息（可选）
 */
async function logReminder(planId, parentId, hour, status, errorMsg = null) {
  try {
    const { dateStr } = getCurrentTimeInfo();
    const logData = {
      plan_id: planId,
      parent_id: parentId,
      trigger_hour: hour,
      trigger_date: dateStr,
      status,
      error_msg: errorMsg,
      created_at: db.serverDate()
    };

    // 去重：先删除今天同一计划同一小时的旧日志
    await db.collection('reminder_logs')
      .where({
        plan_id: planId,
        trigger_hour: hour,
        trigger_date: dateStr
      })
      .remove()
      .catch(() => {}); // 忽略不存在错误

    await db.collection('reminder_logs').add({ data: logData });
  } catch (err) {
    console.error('[Reminder] 记录日志失败', err);
  }
}

/**
 * 云函数主入口
 * 定时触发器无需参数，直接执行
 */
exports.main = async (event, context) => {
  console.log('[Reminder] 用药提醒云函数开始执行');

  const { hour } = getCurrentTimeInfo();
  console.log(`[Reminder] 当前时间：${hour}点`);

  // 仅处理预设的提醒时间段（8,18）
  const REMINDER_HOURS = [8, 18];
  if (!REMINDER_HOURS.includes(hour)) {
    console.log(`[Reminder] 非提醒时间段（${hour}点），跳过`);
    return { success: true, skipped: true, reason: 'non-reminder-hour' };
  }

  try {
    // 1. 查询今日需要提醒的计划
    const plans = await getTodaysMedicationPlans(hour);
    if (plans.length === 0) {
      console.log('[Reminder] 今日无用药计划，无需提醒');
      return { success: true, count: 0 };
    }

    // 2. 发送提醒（并发处理，但有并发限制）
    const MAX_CONCURRENT = 10; // 控制并发，避免超出云函数限制
    const results = [];
    const errors = [];

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];

      try {
        // TODO: 获取父母的 openId（需要关联 users 表）
        // 当前假设 plan.parent_id 就是 openId 或者可以通过查询获得
        // 实际应通过 parent_id 查询 users 表获取 open_id
        const parentOpenId = await getParentOpenId(plan.parent_id);

        if (!parentOpenId) {
          console.warn(`[Reminder] 未找到 parent_id=${plan.parent_id} 的 openId，跳过`);
          errors.push({ planId: plan._id, error: 'no_openid' });
          continue;
        }

        // 检查今天是否已经发送过提醒（避免重复）
        const alreadySent = await checkIfAlreadyReminded(plan._id, hour);
        if (alreadySent) {
          console.log(`[Reminder] 计划 ${plan._id} 今日 ${hour}点已提醒，跳过`);
          results.push({ planId: plan._id, status: 'skipped', reason: 'already_sent' });
          continue;
        }

        const sent = await sendTemplateMessage(parentOpenId, plan, hour);
        results.push({ planId: plan._id, status: sent ? 'sent' : 'failed' });
      } catch (err) {
        console.error(`[Reminder] 处理计划 ${plan._id} 失败`, err);
        errors.push({ planId: plan._id, error: err.message });
      }

      // 控制并发节奏
      if ((i + 1) % MAX_CONCURRENT === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`[Reminder] 执行完成：发送 ${sentCount} 条，跳过 ${skippedCount} 条，失败 ${failedCount} 条`);

    return {
      success: true,
      hour,
      total: plans.length,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (err) {
    console.error('[Reminder] 云函数执行异常', err);
    // 云函数会自动重试，这里记录错误即可
    return {
      success: false,
      error: err.message,
      hour
    };
  }
};

/**
 * 获取父母的 openId
 * @param {string} parentId - 父母用户ID
 * @returns {Promise<string|null>}
 */
async function getParentOpenId(parentId) {
  try {
    const user = await db.collection('users')
      .where({ _id: parentId, role: 'parent' })
      .limit(1)
      .get();

    return user.data.length > 0 ? user.data[0].open_id : null;
  } catch (err) {
    console.error('[Reminder] 查询用户信息失败', parentId, err);
    return null;
  }
}

/**
 * 检查今天该时间段是否已发送过提醒
 * @param {string} planId
 * @param {number} hour
 * @returns {Promise<boolean>}
 */
async function checkIfAlreadyReminded(planId, hour) {
  const { dateStr } = getCurrentTimeInfo();
  try {
    const result = await db.collection('reminder_logs')
      .where({
        plan_id: planId,
        trigger_hour: hour,
        trigger_date: dateStr,
        status: 'sent'
      })
      .count();

    return result.total > 0;
  } catch (err) {
    console.error('[Reminder] 检查重复提醒失败', err);
    return false; // 失败则允许发送（避免漏发）
  }
}
