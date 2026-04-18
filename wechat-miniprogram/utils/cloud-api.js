/**
 * 云函数调用封装
 * 与 utils/api.js 提供相同的接口，底层走 wx.cloud.callFunction
 */

function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        const result = res.result;
        if (result && result.success !== false) {
          resolve(result);
        } else {
          const msg = result?.error || '请求失败';
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail: err => {
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
      }
    });
  });
}

// ── 登录 ──
function login(role, nickname) {
  return call('login', { action: 'login', role, nickname });
}
function getProfile() {
  return call('login', { action: 'profile' });
}
function seedParent(nickname) {
  return call('login', { action: 'seedParent', nickname });
}

// ── 绑定 ──
function bindInvite(invite_code) {
  return call('invite', { action: 'bind', invite_code });
}

// ── 微信运动 ──
function injectWerunMock(parentId, steps, data_date) {
  return call('werun', { action: 'decrypt', parent_id: parentId, steps, data_date });
}
function getWerunSteps(parentId, days = 7) {
  return call('werun', { action: 'getSteps', parent_id: parentId, days });
}

// ── 用药 ──
function createMedPlan(plan) {
  return call('medication', { action: 'createPlan', ...plan });
}
function getMedPlans(parentId) {
  return call('medication', { action: 'getPlans', parent_id: parentId });
}
function confirmMedication(planId, parentId, role, status) {
  return call('medication', { action: 'confirm', plan_id: planId, parent_id: parentId, role, status });
}
function getMedStats(parentId, days = 7) {
  return call('medication', { action: 'stats', parent_id: parentId, days });
}

// v0.2 每日确认
function confirmDaily(parentId, role, medTaken, date) {
  if (role !== 'parent') return Promise.reject(new Error('Only parent can confirm'));
  return call('medication', { action: 'dailyConfirm', parent_id: parentId, date, med_taken: medTaken });
}

// v0.2 每周确认
function confirmMedWeekly(parentId, answer, date) {
  return call('medication', { action: 'weeklyConfirm', parent_id: parentId, date, answer });
}

// v0.2 用药提醒设置
function getReminderSettings(parentId) {
  return call('medication', { action: 'getReminderSettings', parent_id: parentId });
}
function saveReminderSettings(parentId, times) {
  return call('medication', { action: 'saveReminderSettings', parent_id: parentId, reminder_times: times });
}

// ── 周报 ──
function generateReport(parentAId, parentBId) {
  return call('report', { action: 'generate', parent_a_id: parentAId, parent_b_id: parentBId });
}
function getReportHistory(childId, weeks = 4) {
  return call('report', { action: 'history', child_id: childId, weeks });
}
function getCompare(childId, weeks = 4) {
  return call('report', { action: 'compare', child_id: childId, weeks });
}

// ── 子女回声 ──
function getFeedbackOptions() {
  return call('feedback', { action: 'options' });
}
function submitEchoFeedback(childId, parentId, feedbackType, reportId) {
  return call('feedback', { action: 'submit', child_id: childId, parent_id: parentId, feedback_type: feedbackType, report_id: reportId });
}
function getLatestFeedback(parentId) {
  return call('feedback', { action: 'latest', parent_id: parentId });
}

// ── 安全检查清单（P1 任务3） ──
function getChecklistWeekly(user_id, week_start) {
  return call('checklist', { action: 'getWeekly', user_id, week_start });
}
function completeChecklist(item_id, notes, user_id, week_start) {
  return call('checklist', { action: 'complete', item_id, notes, user_id, week_start });
}
function getChecklistHistory(user_id, limit) {
  return call('checklist', { action: 'history', user_id, limit });
}

// ── 焦虑量表（P1-7） ──
function getAnxietyQuestions() {
  return call('survey', { action: 'questions' });
}
function submitAnxietySurvey(childId, answers) {
  return call('survey', { action: 'submit', child_id: childId, answers });
}
function getAnxietyHistory(childId, limit) {
  return call('survey', { action: 'history', child_id: childId, limit });
}

module.exports = {
  call,
  // 登录
  login, getProfile, seedParent,
  // 绑定
  bindInvite,
  // 微信运动
  injectWerunMock, getWerunSteps,
  // 用药
  createMedPlan, getMedPlans, confirmMedication, getMedStats,
  confirmDaily, confirmMedWeekly, getReminderSettings, saveReminderSettings,
  // 周报
  generateReport, getReportHistory, getCompare,
  // 子女回声
  getFeedbackOptions, submitEchoFeedback, getLatestFeedback,
  // 安全检查清单
  getChecklistWeekly, completeChecklist, getChecklistHistory,
  // 焦虑量表
  getAnxietyQuestions, submitAnxietySurvey, getAnxietyHistory
};
