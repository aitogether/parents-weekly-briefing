const db = require('../common/db');
const logger = require('../common/logger');

exports.main = async (event) => {
  const { phoneNumber, parentId, eventType } = event;
  
  if (eventType === 'check') {
    return await checkNumber(phoneNumber, parentId);
  }
  
  return { error: 'unknown type' };
};

async function checkNumber(phoneNumber, parentId) {
  const db = cloudbase.database();
  
  // 查询缓存
  const cache = await db.collection('secure_cache')
    .where({ phoneNumber, expiresAt: db.command.gt(new Date()) })
    .limit(1)
    .get();
  
  if (cache.data.length > 0) {
    return cache.data[0];
  }
  
  // 模拟第三方 API 调用（实际需要替换）
  const riskLevel = Math.random() > 0.8 ? 'high' : 'low';
  
  // 缓存 24h
  await db.collection('secure_cache').add({
    data: {
      phoneNumber,
      riskLevel,
      fraudType: riskLevel === 'high' ? 'impersonation' : null,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    }
  });
  
  if (riskLevel === 'high') {
    await db.collection('secure_calls').add({
      data: {
        parentId,
        phoneNumber,
        riskLevel: 'high',
        incomingAt: new Date(),
        childNotified: true
      }
    });
  }
  
  return { phoneNumber, riskLevel };
}
