/**
 * 字段级加密工具（P1-6 隐私安全）
 *
 * 使用 AES-256-CBC 加密敏感字段（健康数据、用药记录）。
 * 密钥来自环境变量 DATA_ENCRYPTION_KEY（hex string，64 chars）。
 * 未配置时跳过加密（开发模式）。
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey() {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, 'hex');
}

/**
 * 加密一个字符串值
 * @param {string} plaintext - 明文
 * @returns {string|null} 格式: "iv:encrypted" (hex)，未配置 key 时返回 null
 */
function encrypt(plaintext) {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 解密一个加密值
 * @param {string} ciphertext - "iv:encrypted" 格式
 * @returns {string|null} 明文，解密失败返回 null
 */
function decrypt(ciphertext) {
  const key = getKey();
  if (!key) return null;
  const parts = ciphertext.split(':');
  if (parts.length !== 2) return null;
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 对象字段加密：加密指定字段
 * @param {Object} obj - 原始对象
 * @param {string[]} fields - 需要加密的字段名
 * @returns {Object} 加密后的对象
 */
function encryptFields(obj, fields) {
  const key = getKey();
  if (!key) return obj;
  const result = { ...obj };
  for (const f of fields) {
    if (result[f] !== undefined && result[f] !== null) {
      result[f] = encrypt(String(result[f]));
    }
  }
  return result;
}

/**
 * 对象字段解密
 */
function decryptFields(obj, fields) {
  const key = getKey();
  if (!key) return obj;
  const result = { ...obj };
  for (const f of fields) {
    if (result[f] && typeof result[f] === 'string' && result[f].includes(':')) {
      const d = decrypt(result[f]);
      if (d !== null) result[f] = d;
    }
  }
  return result;
}

/**
 * 生成随机加密密钥（用于初始化）
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { encrypt, decrypt, encryptFields, decryptFields, generateKey };
