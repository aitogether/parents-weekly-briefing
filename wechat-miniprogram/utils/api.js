/**
 * utils/api.js — 后端接口封装（已对齐 backend 路由）
 */

const app = getApp();

const BASE_URL_KEY = 'API_BASE_URL';

function getBaseUrl() {
  return app.globalData[BASE_URL_KEY] || '';
}

function getToken() {
  return app.globalData.token || '';
}

function request({ url, method = 'GET', data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': getToken() ? `Bearer ${getToken()}` : '',
        ...header
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = res.data?.error || '请求失败';
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        reject(err);
      }
    });
  });
}

// ── 微信运动 ──
function injectWerunMock(parentId) {
  return request({ url: '/api/werun/decrypt', method: 'POST', data: { parent_id: parentId } });
}
function getWerunSteps(parentId, days = 7) {
  return request({ url: '/api/werun/steps', data: { parent_id: parentId, days } });
}

// ── 用药 ──
function createMedPlan(plan) {
  return request({ url: '/api/med/plan', method: 'POST', data: plan });
}
function getMedPlans(parentId) {
  return request({ url: '/api/med/plans', data: { parent_id: parentId } });
}
function confirmMedication(planId, parentId, role, status) {
  return request({
    url: '/api/med/confirm',
    method: 'POST',
    data: { plan_id: planId, parent_id: parentId, role, status }
  });
}
function getMedStats(parentId, days = 7) {
  return request({ url: '/api/med/stats', data: { parent_id: parentId, days } });
}

// ── 周报 ──
function generateReport(parentAId, parentBId) {
  return request({
    url: '/api/report/generate',
    method: 'POST',
    data: { parent_a_id: parentAId, parent_b_id: parentBId }
  });
}

// ── 子女回声 ──
function getFeedbackOptions() {
  return request({ url: '/api/feedback/options' });
}
function submitEchoFeedback(childId, parentId, feedbackType, reportId) {
  return request({
    url: '/api/feedback',
    method: 'POST',
    data: { child_id: childId, parent_id: parentId, feedback_type: feedbackType, report_id: reportId }
  });
}
function getLatestFeedback(parentId) {
  return request({ url: '/api/feedback/latest', data: { parent_id: parentId } });
}

// ── 每日确认（v0.2 一键确认） ──
function confirmDaily(parentId, role, medTaken) {
  return request({
    url: '/api/med/daily-confirm',
    method: 'POST',
    data: { parent_id: parentId, role, med_taken: medTaken }
  });
}

// ── 每周用药确认（v0.2 周日确认） ──
function confirmMedWeekly(parentId, answer) {
  return request({
    url: '/api/med/weekly-confirm',
    method: 'POST',
    data: { parent_id: parentId, answer }
  });
}

// ── 用药提醒设置（v0.2） ──
function getReminderSettings(parentId) {
  return request({ url: '/api/med/reminder-settings', data: { parent_id: parentId } });
}
function saveReminderSettings(parentId, times) {
  return request({
    url: '/api/med/reminder-settings',
    method: 'POST',
    data: { parent_id: parentId, reminder_times: times }
  });
}

// ── 发送用药提醒（v0.2） ──
function sendReminder(parentId, message) {
  return request({
    url: '/api/med/send-reminder',
    method: 'POST',
    data: { parent_id: parentId, message }
  });
}

// ── 焦虑量表（P1-7） ──
function submitAnxietySurvey(childId, answers) {
  return request({
    url: '/api/survey/anxiety',
    method: 'POST',
    data: { child_id: childId, answers }
  });
}

function getAnxietyHistory(childId, limit) {
  return request({
    url: `/api/survey/anxiety/history?child_id=${childId}&limit=${limit || 10}`
  });
}

// ── 用户资料 ──
function getProfile() {
  return request({ url: '/api/auth/profile' });
}

module.exports = {
  request,
  injectWerunMock,
  getWerunSteps,
  createMedPlan,
  getMedPlans,
  confirmMedication,
  getMedStats,
  generateReport,
  getFeedbackOptions,
  submitEchoFeedback,
  getLatestFeedback,
  confirmDaily,
  confirmMedWeekly,
  getReminderSettings,
  saveReminderSettings,
  getProfile,
  sendReminder,
  submitAnxietySurvey,
  getAnxietyHistory
};
