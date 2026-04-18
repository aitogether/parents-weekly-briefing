# 云函数开发规范（CloudBase 云开发）

**项目**：父母这一周  
**版本**：v1.0  
**日期**：2026-04-16  
**适用平台**：微信云开发（Tencent CloudBase）

---

## 📁 目录结构规范

```
cloudfunctions/
├── common/                    # 公共工具库（所有函数共享）
│   ├── db.js                  # 数据库操作封装
│   ├── notifier.js            # 消息推送封装
│   ├── logger.js              # 日志工具
│   ├── validator.js           # 参数验证
│   ├── errors.js              # 错误码定义
│   └── utils.js               # 通用工具函数
│
├── login/                     # 云函数：登录
│   ├── index.js              # 主入口（必须）
│   ├── package.json          # 依赖声明
│   └── README.md             # 函数说明（可选）
│
├── medication/               # 云函数：用药提醒
│   ├── index.js
│   ├── package.json
│   └── config.json           # 定时触发器配置
│
├── report/                   # 云函数：周报生成
│   ├── index.js
│   ├── package.json
│   └── config.json
│
├── ...（其他云函数）
│
└── README.md                 # 云函数总体说明
```

**规则**：
- 每个云函数必须包含 `index.js` 和 `package.json`
- 公共代码放在 `common/`，通过 `require` 引用
- 配置文件 `config.json` 仅用于定时触发器设置

---

## 📦 依赖管理规范

### package.json 模板

```json
{
  "name": "parents-weekly-briefing-medication",
  "version": "1.0.0",
  "description": "用药提醒云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3",      // 必须，微信服务端 SDK
    "dayjs": "^1.11.10",            // 时间处理（可选）
    "lodash": "^4.17.21"            // 工具库（可选）
  }
}
```

**依赖原则**：
- 仅安装必要依赖，减少包体积
- 使用 `~` 锁定次版本号，避免-breaking change
- 定期运行 `npm outdated` 检查更新

**安装命令**：
```bash
cd cloudfunctions/medication
npm install
```

---

## 🧱 编码规范

### 1. 模块导出

**正确**：
```javascript
exports.main = async (event, context) => {
  // 主逻辑
  return { success: true, data: result };
};
```

**错误**：
```javascript
module.exports = async (event, context) => { ... }  // 不支持
```

---

### 2. 异步处理

**必须使用 async/await**：

```javascript
exports.main = async (event, context) => {
  try {
    const { action, parentId } = event;
    
    // 异步操作必须 await
    const user = await db.collection('users').doc(parentId).get();
    
    if (!user) {
      return { success: false, code: 'USER_NOT_FOUND' };
    }
    
    return { success: true, data: user };
  } catch (err) {
    console.error('Error:', err);
    return { success: false, code: 'INTERNAL_ERROR', message: err.message };
  }
};
```

**禁止**：
```javascript
// ❌ 不要使用回调
db.collection('users').get().then(res => { ... });

// ❌ 不要忘记 await
const user = db.collection('users').doc(id).get();  // 返回 Promise，不会等待
```

---

### 3. 错误处理

**统一错误码**（定义在 `common/errors.js`）：

```javascript
// common/errors.js
module.exports = {
  SUCCESS: { code: 0, message: '成功' },
  INVALID_PARAM: { code: 1001, message: '参数无效' },
  USER_NOT_FOUND: { code: 1002, message: '用户不存在' },
  PERMISSION_DENIED: { code: 1003, message: '无权限' },
  DATABASE_ERROR: { code: 2001, message: '数据库错误' },
  EXTERNAL_API_FAILED: { code: 3001, message: '第三方服务异常' },
  INTERNAL_ERROR: { code: 9999, message: '系统内部错误' }
};
```

**使用示例**：
```javascript
const ERRORS = require('./common/errors');

exports.main = async (event) => {
  // 参数校验
  if (!event.parentId) {
    return { success: false, ...ERRORS.INVALID_PARAM };
  }
  
  try {
    // 业务逻辑
    return { success: true, ...ERRORS.SUCCESS };
  } catch (err) {
    // 统一异常处理
    console.error('[ERROR]', err);
    return { success: false, ...ERRORS.INTERNAL_ERROR, detail: err.message };
  }
};
```

---

### 4. 日志规范

**日志级别**：
- `console.log()`：普通信息（调试用，生产环境少用）
- `console.info()`：关键流程节点
- `console.warn()`：警告（如数据异常、重试）
- `console.error()`：错误（必须包含上下文）

**日志格式**（使用 `common/logger.js`）：

```javascript
const logger = require('./common/logger');

logger.info('Function started', { parentId, action });
logger.warn('Medication not taken', { planId, parentId, scheduledTime });
logger.error('Database query failed', { error: err.message, stack: err.stack });
```

**输出示例**（云开发控制台可读）：
```
[INFO] [medication] Function started - {"parentId":"user_123","action":"send_reminder"}
[WARN] [medication] Medication not taken - {"planId":"plan_001","parentId":"user_123"}
[ERROR] [medication] DB query failed - {"error":"ETIMEDOUT","stack":"..."}
```

---

### 5. 数据库操作规范

**使用 `common/db.js` 封装**：

```javascript
// common/db.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

module.exports = {
  // 安全查询（自动过滤敏感字段）
  query: async (collection, filter, options = {}) => {
    const result = await cloud.database().collection(collection)
      .where(filter)
      .limit(options.limit || 100)
      .skip(options.skip || 0)
      .order(options.order || 'createdAt', 'desc')
      .get();
    return result.data;
  },
  
  // 安全写入（自动添加时间戳）
  insert: async (collection, data) => {
    const now = new Date();
    return await cloud.database().collection(collection).add({
      data: {
        ...data,
        createdAt: now,
        updatedAt: now
      }
    });
  },
  
  // 安全更新（乐观锁）
  update: async (collection, id, data, expectedVersion) => {
    return await cloud.database().collection(collection).doc(id).update({
      data: {
        ...data,
        updatedAt: new Date(),
        _version: expectedVersion ? expectedVersion + 1 : 1
      }
    });
  }
};
```

**使用示例**：
```javascript
const db = require('./common/db');

// 查询
const users = await db.query('users', { role: 'child' });

// 插入
await db.insert('medication_records', {
  parentId: 'user_123',
  planId: 'plan_001',
  status: 'taken'
});
```

---

### 6. 参数验证规范

**必须验证所有输入参数**（使用 `common/validator.js`）：

```javascript
const validator = require('./common/validator');

exports.main = async (event) => {
  // 1. 必填参数校验
  const { parentId, medication, dosage, time } = event;
  const errors = [];
  
  if (!validator.isValidOpenId(parentId)) {
    errors.push('parentId 格式无效');
  }
  if (!validator.isNonEmptyString(medication, 20)) {
    errors.push('medication 不能为空且不超过20字');
  }
  if (!validator.isValidTime(time)) {
    errors.push('time 格式应为 HH:mm');
  }
  
  if (errors.length > 0) {
    return { success: false, code: 'INVALID_PARAM', errors };
  }
  
  // 2. 业务逻辑校验
  const existing = await db.query('medication_plans', { parentId, time });
  if (existing.length >= 10) {
    return { success: false, code: 'PLAN_LIMIT_EXCEEDED', message: '最多设置10个用药计划' };
  }
  
  // 3. 正常执行
  ...
};
```

---

## 🔔 消息推送规范

### 使用 `common/notifier.js`

```javascript
const notifier = require('./common/notifier');

// 推送给药提醒（父母端）
await notifier.sendToParent(parentId, 'medication_reminder', {
  planId: 'plan_001',
  medication: '降压药',
  time: '08:00'
});

// 推送预警给子女端
await notifier.sendToChild(childId, 'security_alert', {
  type: 'gas_leak',
  location: '厨房',
  level: 'high'
});

// 批量推送（多个子女）
await notifier.sendToFamily(familyId, 'weekly_report', {
  reportId: 'report_001',
  week: '第15周'
});
```

**消息模板**（在 `notifier.js` 中定义）：
```javascript
const TEMPLATES = {
  medication_reminder: {
    title: '用药提醒',
    body: '该吃{medication}了，时间 {time}',
    type: 'important'  // important/normal/minor
  },
  security_alert: {
    title: '安全预警',
    body: '{type}报警，位置{location}',
    type: 'important'
  }
};
```

---

## ⏱️ 定时触发器配置

### 格式：`config.json`

```json
{
  "triggers": [
    {
      "name": "medication-morning",
      "type": "timer",
      "config": "0 0 8 * * * *"  // 每天 8:00
    },
    {
      "name": "medication-evening",
      "type": "timer",
      "config": "0 0 20 * * * *"  // 每天 20:00
    },
    {
      "name": "weekly-report",
      "type": "timer",
      "config": "0 0 9 * * 1 *"  // 每周一 9:00
    }
  ]
}
```

**Cron 表达式**（6位或7位）：
```
秒 分 时 日 月 周 年（可选）
0  0  8  *  *  *  *    → 每天 8:00
0  0  9  *  *  1  *    → 每周一 9:00
0  0  8,20 *  *  *  *  → 每天 8:00 和 20:00
```

**上传后生效**：
```bash
# 在云函数目录执行
tcb functions deploy medication --config config.json
```

---

## 🔐 安全规范

### 1. 权限校验

**每个云函数必须验证调用者身份**：

```javascript
exports.main = async (event, context) => {
  const { userInfo } = context;
  const openid = userInfo && userInfo.openId;
  
  if (!openid) {
    return { success: false, code: 'UNAUTHORIZED' };
  }
  
  // 查询用户角色
  const user = await db.collection('users').where({ openid }).get();
  if (!user.length) {
    return { success: false, code: 'USER_NOT_FOUND' };
  }
  
  // 继续业务逻辑...
};
```

### 2. 数据脱敏

**返回给前端的数据必须过滤敏感字段**：

```javascript
const safeUser = {
  _id: user._id,
  nickname: user.nickname,
  role: user.role,
  // ❌ 不返回 openid、phoneNumber、email（除非必要）
};
```

---

## 🧪 测试规范

### 本地测试（使用 CloudBase CLI）

```javascript
// 创建 test 目录
cloudfunctions/
├── test/
│   ├── login.test.js
│   ├── medication.test.js
│   └── utils.js
```

**测试示例**（`test/medication.test.js`）：
```javascript
const tcb = require('wx-server-sdk');
const medication = require('../medication');

describe('medication cloud function', () => {
  test('should send reminder at scheduled time', async () => {
    const event = { parentId: 'test_parent_001' };
    const result = await medication.main(event);
    expect(result.success).toBe(true);
    expect(result.sent).toBeGreaterThan(0);
  });
  
  test('should reject invalid parentId', async () => {
    const event = { parentId: '' };
    const result = await medication.main(event);
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_PARAM');
  });
});
```

**运行测试**：
```bash
cd cloudfunctions
npm test  # 或使用云函数本地调试工具
```

---

## 📊 监控与告警

### 关键指标监控

| 指标 | 阈值 | 告警方式 |
|------|------|----------|
| 云函数错误率 | > 5% | 邮件 + 企业微信 |
| 平均响应时间 | > 3s | 邮件 |
| 数据库慢查询 | > 100ms | 日志 |
| 定时任务 missed | > 0 次 | 邮件 + 短信 |

### 日志分级

```
[DEBUG] - 调试信息（开发环境）
[INFO]  - 关键流程节点
[WARN]  - 异常但可恢复（如重试）
[ERROR] - 错误（需要关注）
[FATAL] - 致命错误（自动重启）
```

---

## 🚀 部署清单

### 开发环境
- [ ] 本地安装 CloudBase CLI (`npm install -g cloudbase`)
- [ ] 登录：`cloudbase login`
- [ ] 选择环境：`cloudbase env:use prod-d7g1v6s7w213c04e0`

### 部署命令
```bash
# 单个函数部署
cd cloudfunctions/medication
cloudbase functions:deploy medication --dependencies

# 批量部署（所有函数）
cd cloudfunctions
for dir in */; do
  echo "Deploying $dir..."
  cloudbase functions:deploy ${dir%/} --dependencies
done
```

### 验证步骤
1. 云开发控制台查看函数状态（应为「运行中」）
2. 查看最新日志（无 ERROR）
3. 测试触发器（手动触发定时任务）
4. 检查数据库写入（如有）

---

## 🔄 版本管理

### 版本号规范
```
主版本.次版本.修订号  (MAJOR.MINOR.PATCH)
1.0.0
```

- **MAJOR**：破坏性变更（API 不兼容）
- **MINOR**：新增功能（向后兼容）
- **PATCH**：Bug 修复

**示例**：
- `1.0.0` → 初始版本
- `1.1.0` → 新增「扫码帮手」功能
- `1.1.1` → 修复用药提醒 Bug

---

## 📝 代码审查清单

提交代码前检查：
- [ ] 参数验证是否完整？
- [ ] 错误处理是否覆盖所有分支？
- [ ] 日志输出是否清晰（包含关键上下文）？
- [ ] 数据库操作是否使用封装方法？
- [ ] 是否泄露敏感信息（openid、phone）？
- [ ] 是否有无限重试风险（应设置最大重试次数）？
- [ ] 定时触发器配置是否正确？
- [ ] 单元测试是否通过？

---

## 🎯 下一步

### 步骤 C：代码模板生成

接下来我会为每个云函数生成：
1. **完整的 index.js 模板**（含错误处理、日志、验证）
2. **package.json 模板**
3. **config.json 定时触发器配置**
4. **README.md**（函数说明、测试方法）

**现在开始生成代码模板吗？**
