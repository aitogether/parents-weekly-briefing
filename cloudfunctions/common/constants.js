module.exports = {
  ROLES: { CHILD: 'child', PARENT: 'parent' },
  CONFIRM_STATUS: { TAKEN: 'taken', SKIPPED: 'skipped' },
  FEEDBACK_OPTIONS: [
    { type: 'reassured', text: '今天我看过你的情况，一切放心。' },
    { type: 'concerned', text: '最近有点担心，改天好好跟你聊聊。' },
    { type: 'busy_caring', text: '我这几天有点忙，但一直惦记着你。' }
  ],
  // 步数日均阈值
  STEPS_YELLOW: 1500,
  STEPS_RED: 500,
  // 用药完成率阈值
  MED_YELLOW: 80,
  MED_RED: 60,
  // 邀请码字符集（去掉容易混淆的 I/O/0/1）
  INVITE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  INVITE_LENGTH: 6
};

// 扫码帮手类型
QR_TYPE: {
  MEDICINE: 'medicine',
  FOOD: 'food',
  PRODUCT: 'product'
},
QR_MAX_HISTORY_DAYS: 30,
QR_MAX_HISTORY_COUNT: 100
