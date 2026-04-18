// 错误码定义
const ERROR_CODES = {
  INVALID_PARAM: { code: 'INVALID_PARAM', status: 400, message: '参数无效' },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: '资源不存在' },
  NO_PERMISSION: { code: 'NO_PERMISSION', status: 403, message: '无操作权限' },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', status: 500, message: '数据库错误' }
};

class AppError extends Error {
  constructor(errorCode, details) {
    super(ERROR_CODES[errorCode]?.message || 'Unknown error');
    this.code = errorCode;
    this.status = ERROR_CODES[errorCode]?.status || 500;
    this.details = details;
  }
}

module.exports = { ERROR_CODES, AppError };
