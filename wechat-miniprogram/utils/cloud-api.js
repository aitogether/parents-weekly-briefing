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

// ── 周报 ──
function generateReport(parentAId, parentBId) {
  return call('report', { action: 'generate', parent_a_id: parentAId, parent_b_id: parentBId });
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

module.exports = {
  call,
  login, getProfile, seedParent,
  bindInvite,
  injectWerunMock, getWerunSteps,
  createMedPlan, getMedPlans, confirmMedication, getMedStats,
  generateReport,
  getFeedbackOptions, submitEchoFeedback, getLatestFeedback
};
