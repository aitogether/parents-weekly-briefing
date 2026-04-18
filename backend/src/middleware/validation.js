const { body, query, param, validationResult } = require('express-validator');

// 通用验证规则
const validators = {
  // 基础ID验证
  id: (field = 'id') => [
    body(field).optional().isString().trim().notEmpty(),
    query(field).optional().isString().trim().notEmpty(),
    param(field).optional().isString().trim().notEmpty()
  ],

  // parent_id 验证（字符串）
  parentId: () => [
    body('parent_id').exists().withMessage('parent_id is required')
      .isString().withMessage('parent_id must be a string')
      .trim().notEmpty().withMessage('parent_id cannot be empty'),
    query('parent_id').optional().isString().withMessage('parent_id must be a string')
      .trim().notEmpty().withMessage('parent_id cannot be empty')
  ],

  // dosage 验证（非空字符串）
  dosage: () => [
    body('dosage').exists().withMessage('dosage is required')
      .isString().withMessage('dosage must be a string')
      .trim().notEmpty().withMessage('dosage cannot be empty')
  ],

  // schedule 验证（数组）
  schedule: () => [
    body('schedule').exists().withMessage('schedule is required')
      .isArray({ min: 1 }).withMessage('schedule must be a non-empty array')
  ],

  // steps 验证（正整数）
  steps: () => [
    body('steps').exists().withMessage('steps is required')
      .isInt({ min: 1 }).withMessage('steps must be a positive integer')
  ],

  // data_date 验证（ISO日期格式）
  dataDate: () => [
    body('data_date').optional().isISO8601().withMessage('data_date must be a valid ISO date')
  ],

  // feedback_type 验证（枚举值）
  feedbackType: () => [
    body('feedback_type').exists().withMessage('feedback_type is required')
      .isIn(['good', 'normal', 'poor']).withMessage('feedback_type must be one of: good, normal, poor')
  ],

  // answers 验证（数组，每个元素有id和value）
  surveyAnswers: () => [
    body('answers').exists().withMessage('answers is required')
      .isArray({ min: 1 }).withMessage('answers must be a non-empty array')
      .custom((arr) => {
        for (let i = 0; i < arr.length; i++) {
          const item = arr[i];
          if (!item.question_id || item.score === undefined) {
            throw new Error(`Each answer needs question_id and score`);
          }
          if (item.score < 1 || item.score > 10) {
            throw new Error(`Score must be between 1 and 10`);
          }
        }
        return true;
      })
  ],

  // child_id 验证
  childId: () => [
    body('child_id').exists().withMessage('child_id is required')
      .isString().withMessage('child_id must be a string')
      .trim().notEmpty().withMessage('child_id cannot be empty')
  ],

  // role 验证
  role: () => [
    body('role').optional().isIn(['child', 'parent']).withMessage('role must be either child or parent')
  ],

  // plan_id 验证
  planId: () => [
    body('plan_id').exists().withMessage('plan_id is required')
      .isString().withMessage('plan_id must be a string')
      .trim().notEmpty().withMessage('plan_id cannot be empty')
  ],

  // status 验证
  medStatus: () => [
    body('status').exists().withMessage('status is required')
      .isIn(['taken', 'skipped']).withMessage('status must be either taken or skipped')
  ],

  // nickname 验证
  nickname: () => [
    body('nickname').exists().withMessage('nickname is required')
      .isString().withMessage('nickname must be a string')
      .trim().notEmpty().withMessage('nickname cannot be empty')
      .isLength({ max: 50 }).withMessage('nickname cannot exceed 50 characters')
  ],

  // reminder_times 验证
  reminderTimes: () => [
    body('reminder_times').exists().withMessage('reminder_times is required')
      .isArray({ min: 1, max: 3 }).withMessage('reminder_times must be an array of 1-3 time strings')
      .custom((times) => {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return times.every(time => timeRegex.test(time));
      }).withMessage('Each time must be in HH:MM format')
  ],

  // message 验证
  message: () => [
    body('message').optional().isString().withMessage('message must be a string')
      .trim().isLength({ max: 500 }).withMessage('message cannot exceed 500 characters')
  ],

  // report_id 验证
  reportId: () => [
    body('report_id').optional().isString().withMessage('report_id must be a string')
      .trim().notEmpty().withMessage('report_id cannot be empty')
  ]
};

// 通用验证中间件
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = [];
    errors.array().forEach(error => {
      extractedErrors.push({
        field: error.param,
        message: error.msg
      });
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: extractedErrors
    });
  };
};

module.exports = {
  validators,
  validate
};