/**
 * 微信登录 — code2session
 * 生产环境：调用微信 API 换取 open_id + session_key
 * 开发环境：mock open_id（无 appid 时自动降级）
 */
const https = require('https');

const CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

async function code2session(code) {
  const appid = process.env.WECHAT_APPID;
  const appsecret = process.env.WECHAT_APPSECRET;

  // 开发环境降级：没有配置 appid 时用 mock
  if (!appid || !appsecret || appid === '你的appid') {
    console.warn('[WeChat] appid/appsecret 未配置，使用 mock open_id');
    return { open_id: `mock_${code}`, session_key: 'mock_session' };
  }

  const url = `${CODE2SESSION_URL}?appid=${appid}&secret=${appsecret}&js_code=${code}&grant_type=authorization_code`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.openid) {
            resolve({ open_id: json.openid, session_key: json.session_key });
          } else {
            console.error('[WeChat] code2session 失败:', json);
            reject(new Error(json.errmsg || 'code2session failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

module.exports = { code2session };
