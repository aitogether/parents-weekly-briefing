/**
 * utils/api.js
 * 封装 wx.request，统一处理 base url、token、错误
 */

const app = getApp();

const BASE_URL_KEY = 'API_BASE_URL';

function getBaseUrl() {
  return app.globalData[BASE_URL_KEY] || '';
}

function getToken() {
  return app.globalData.token || '';
}

/**
 * 通用请求方法
 * @param {Object} options
 * @param {string} options.url    - 接口路径（不含 base）
 * @param {string} options.method - GET / POST / PUT / DELETE
 * @param {Object} options.data   - 请求参数
 * @param {Object} options.header - 额外 header
 */
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
        } else if (res.statusCode === 401) {
          // token 过期，清除并跳转登录
          app.clearAuth();
          wx.showToast({ title: '请重新登录', icon: 'none' });
          reject(new Error('Unauthorized'));
        } else {
          const msg = res.data?.message || res.data?.msg || '请求失败';
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

// ── 业务接口 ──

/** 获取周报数据 */
function getWeeklyReport(weekStart) {
  return request({
    url: '/api/weekly-report',
    data: { weekStart }
  });
}

/** 获取每日小结 */
function getDailySummary(date) {
  return request({
    url: '/api/daily-summary',
    data: { date }
  });
}

/** 获取用药统计 */
function getMedStats(range) {
  return request({
    url: '/api/medication-stats',
    data: { range }
  });
}

/** 确认用药（老人端） */
function confirmMedication(recordId, status) {
  return request({
    url: '/api/medication/confirm',
    method: 'POST',
    data: { recordId, status } // status: 'taken' | 'skipped'
  });
}

/** 创建用药计划 */
function createMedPlan(plan) {
  return request({
    url: '/api/medication/plans',
    method: 'POST',
    data: plan
  });
}

/** 获取用药计划列表 */
function getMedPlans() {
  return request({ url: '/api/medication/plans' });
}

/** 提交子女反馈 */
function submitFeedback(reportId, status) {
  return request({
    url: '/api/weekly-report/feedback',
    method: 'POST',
    data: { reportId, status } // status: 'talked' | 'not_talked'
  });
}

/** 更新通知设置 */
function updateNotificationSettings(settings) {
  return request({
    url: '/api/settings/notifications',
    method: 'PUT',
    data: settings
  });
}

/** 获取通知设置 */
function getNotificationSettings() {
  return request({ url: '/api/settings/notifications' });
}

module.exports = {
  request,
  getWeeklyReport,
  getDailySummary,
  getMedStats,
  confirmMedication,
  createMedPlan,
  getMedPlans,
  submitFeedback,
  updateNotificationSettings,
  getNotificationSettings
};
