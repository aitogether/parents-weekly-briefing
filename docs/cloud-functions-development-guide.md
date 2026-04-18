# 云函数开发规范

> 基于 `parents-weekly-briefing` 项目现有云函数模式总结
> 适用范围：微信小程序云开发（云函数 + 云数据库）
> 版本：v1.0 | 最后更新：2026-04-18

---

## 📁 项目结构

```
cloudfunctions/
├── [模块名]/              # 每个业务模块一个目录
│   └── index.js          # 云函数入口文件
├── common/               # 公共工具模块
│   ├── db.js             # 数据库操作封装
│   ├── response.js       # 统一响应格式
│   ├── constants.js      # 常量定义
│   └── auth.js           # 认证相关（可选）
└── [其他模块]/
    ├── medication/
    ├── report/
    ├── werun/
    ├── survey/
    ├── feedback/
    ├── checklist/
    └── ...
```

**命名约定**：
- 目录名使用**单数名词**（`medication` 而非 `medications`）
- 文件名为小写 `index.js`
- 云函数部署后名称与目录名一致

---

## 🔧 基础模板

### 1. 云函数入口文件（index.js）

```javascript
// 1. 引入云开发 SDK
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });  // 必须：使用当前环境

// 2. 引入公共模块
const { getDB } = require('../common/db');
const R = require('../common/response');          // 统一响应 {ok, fail}
const { SOME_CONSTANT } = require('../common/constants');  // 按需引入常量

// 3. 导出主函数
exports.main = async (event, context) => {
  // 3.1 获取数据库实例（统一入口）
  const db = getDB(cloud);

  // 3.2 从 event 中提取 action（Action 模式）
  const { action } = event;

  // 3.3 根据 action 分发到不同处理器
  switch (action) {
    // ==================== 模块一：数据查询 ====================
    case 'getList': {
      const { parent_id, limit = 20 } = event;
      if (!parent_id) return R.fail('parent_id required');

      const list = await db.getSomeData(parent_id, limit);
      return R.ok({ list });
    }

    // ==================== 模块二：数据创建 ====================
    case 'create': {
      const { parent_id, name, value } = event;
      if (!parent_id || !name) return R.fail('parent_id and name required');

      const record = await db.createSomething({ parent_id, name, value });
      return R.ok({ record });
    }

    // ==================== 模块三：统计/分析 ====================
    case 'stats': {
      const { parent_id, days = 7 } = event;
      const data = await db.calculateStats(parent_id, days);
      return R.ok({ stats: data });
    }

    // ==================== 模块四：设置/配置 ====================
    case 'getSettings': {
      const { parent_id } = event;
      const settings = await db.getSettings(parent_id);
      return R.ok(settings || { default: true });
    }

    case 'saveSettings': {
      const { parent_id, ...config } = event;
      const result = await db.saveSettings(parent_id, config);
      return R.ok({ settings: result });
    }

    // ==================== 默认处理 ====================
    default:
      return R.fail('unknown action: ' + action);
  }
};
```

### 2. 数据库封装（common/db.js 新增方法）

```javascript
// 在 getDB() 返回对象中新增方法
async newMethod(params) {
  // 模式1：直接添加（需自动生成时间戳）
  const r = await db.collection('collection_name').add({
    data: {
      ...params,
      created_at: db.serverDate()  // 云开发服务端时间
    }
  });
  return { _id: r._id, ...params };

  // 模式2：查询单条记录
  const r = await db.collection('collection_name')
    .where({ parent_id })
    .limit(1)
    .get();
  return r.data[0] || null;

  // 模式3：查询多条记录（带条件）
  const r = await db.collection('collection_name')
    .where({ parent_id, status: 'active' })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get();
  return r.data;

  // 模式4：更新记录（需先查询 _id）
  await db.collection('collection_name')
    .doc(doc_id)
    .update({
      data: { field: newValue, updated_at: db.serverDate() }
    });

  // 模式5：删除记录（带条件）
  await db.collection('collection_name')
    .where({ parent_id, date: useDate })
    .remove()
    .catch(() => {});  // 忽略不存在记录的异常

  // 模式6：去重写入（先删后增，保证唯一性）
  await db.collection('collection_name')
    .where({ parent_id, date: useDate })
    .remove()
    .catch(() => {});
  const r = await db.collection('collection_name').add({
    data: { parent_id, date: useDate, value }
  });
}
```

---

## 📝 开发规范

### 1. 命名规范

| 元素 | 规范 | 示例 |
|------|------|------|
| Action 名称 | 动宾结构，小写+驼峰 | `getList`, `createPlan`, `confirmMed` |
| 数据库集合 | 蛇形命名，复数 | `medication_plans`, `werun_data` |
| 字段名 | 蛇形命名 | `parent_id`, `confirmed_date`, `created_at` |
| 常量 | 全大写+下划线 | `CONFIRM_STATUS`, `STEPS_YELLOW` |

### 2. 参数验证

**必须验证**：
```javascript
// 必填参数
if (!parent_id) return R.fail('parent_id required');

// 类型检查
if (!Array.isArray(reminder_times)) return R.fail('reminder_times array required');

// 值域检查
if (score < 1 || score > 10) return R.fail('score must be 1-10');

// 枚举检查
if (!['taken', 'skipped'].includes(status)) {
  return R.fail('status must be "taken" or "skipped"');
}

// 角色权限
if (role !== 'parent') return R.fail('Only parent role can confirm', 403);
```

### 3. 错误响应格式

```javascript
// 统一使用 R.fail(message, code)
R.fail('parent_id required');              // 400（默认）
R.fail('Only parent role allowed', 403);   // 403
R.fail('Not found', 404);                  // 404
```

### 4. 成功响应格式

```javascript
// 基础格式
R.ok();                          // { success: true }
R.ok({ plan });                  // { success: true, plan: {...} }
R.ok({ list: [], total: 10 });   // { success: true, list: [...], total: 10 }

// 注意：R.ok() 会自动展开 data 对象到根级别
```

### 5. 数据库时间戳

```javascript
// 创建时
created_at: db.serverDate()   // 云开发服务端时间，避免客户端篡改

// 更新时
updated_at: new Date().toISOString()  // 或 db.serverDate()
```

### 6. 去重策略

```javascript
// 场景：同一天同一计划的多次确认应覆盖
await db.collection('med_confirmations')
  .where({ plan_id, parent_id, confirmed_date: useDate })
  .remove()
  .catch(() => {});  // 忽略"记录不存在"错误

const r = await db.collection('med_confirmations').add({
  data: { plan_id, parent_id, status, confirmed_date: useDate }
});
```

### 7. 分页查询

```javascript
// 查询最近 N 天的数据
const days = 7;
const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const r = await db.collection('records')
  .where({
    parent_id,
    confirmed_date: db.command.gte(since)  // >= since
  })
  .orderBy('confirmed_date', 'desc')
  .limit(100)
  .get();
```

---

## 🆕 新增云函数步骤

### 步骤1：创建目录和文件

```bash
cd cloudfunctions
mkdir qrscan
cd qrscan
touch index.js
```

### 步骤2：编写 index.js

1. 复制[基础模板](#1-云函数入口文件indexjs)
2. 根据业务逻辑实现 `action` 分支
3. 在 `common/db.js` 添加对应的数据库方法
4. 在 `common/constants.js` 添加常量（如有）

### 步骤3：在 common/db.js 添加方法

```javascript
// 在 getDB() 返回对象中添加
async scanQRCode({ parent_id, qr_data, scanned_at }) {
  const r = await db.collection('qr_scans').add({
    data: {
      parent_id,
      qr_data,
      scanned_at: scanned_at || db.serverDate()
    }
  });
  return { _id: r._id, parent_id, qr_data };
},

async getQRScans(parent_id, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const r = await db.collection('qr_scans')
    .where({
      parent_id,
      scanned_at: db.command.gte(since)
    })
    .orderBy('scanned_at', 'desc')
    .limit(50)
    .get();
  return r.data;
}
```

### 步骤4：部署云函数

```bash
# 方式1：微信开发者工具
# 右键 cloudfunctions/qrscan 目录 → 上传并部署：云端安装依赖

# 方式2：命令行（需安装 wxcloud）
wxcloud cloudfunctions deploy qrscan

# 方式3：GitHub Actions（自动）
# 推送代码到 main 分支后，.github/workflows/deploy.yml 会自动部署
```

### 步骤5：测试云函数

```javascript
// 小程序端调用示例（utils/cloud-api.js）
const result = await cloud.callFunction({
  name: 'qrscan',
  data: {
    action: 'scan',
    parent_id: 'parent_123',
    qr_data: 'medicine_001'
  }
});
```

---

## 🧪 测试清单

- [ ] **参数验证**：缺失必填参数应返回 400 + 错误信息
- [ ] **数据类型**：传递错误类型（如字符串代替数组）应被拒绝
- [ ] **权限控制**：`role !== 'parent'` 时返回 403
- [ ] **数据去重**：同一天同一记录重复提交应覆盖而非堆叠
- [ ] **空数据**：查询无记录时返回 `{ list: [] }` 而非 `null`
- [ ] **边界值**：`days=0`、`limit=1000` 等极端情况处理
- [ ] **时区处理**：日期使用 `YYYY-MM-DD` 字符串，避免时区问题

---

## 🔐 安全与合规

### 必须遵守

1. **数据所有权校验**：所有查询必须验证 `parent_id` 属于当前用户
   ```javascript
   // 在 middleware/auth.js 中已有 checkOwnership 中间件
   // 云函数中也需手动校验（或调用后端 API）
   ```

2. **禁止医疗诊断**：
   ❌ `if (blood_pressure > 140) return R.fail('高血压风险')`
   ✅ `return R.ok({ blood_pressure: 145, note: '建议咨询医生' })`

3. **位置数据保护**：
   - 位置共享需显式授权
   - 自动过期（建议 2 小时）
   - 仅存储最近 7 天

4. **日志脱敏**：
   ```javascript
   // ❌ 记录完整 event
   console.log('event:', JSON.stringify(event));
   // ✅ 仅记录必要字段
   console.log('action:', action, 'parent_id:', event.parent_id?.slice(0, 8));
   ```

---

## 📊 数据模型设计

### Collection 命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 主数据 | 蛇形复数 | `medication_plans`, `werun_data` |
| 关联表/日志 | 蛇形复数 | `med_confirmations`, `qr_scans` |
| 设置 | 蛇形复数 | `reminder_settings` |

### 字段规范

```javascript
// 每条记录必须包含
{
  _id: string,           // 自动生成
  parent_id: string,     // 关联用户
  created_at: Date,      // db.serverDate()
  updated_at: Date,      // 可选，更新时记录

  // 业务字段...
}

// 去重记录需包含
{
  parent_id: string,
  confirmed_date: string,  // "YYYY-MM-DD" 格式
  // ... 其他业务字段
}
```

---

## 🚀 部署与监控

### 部署命令

```bash
# 单个云函数部署
cd cloudfunctions/qrscan
npm install  # 安装依赖（如有）
# 右键 → 上传并部署：云端安装依赖

# 全部部署（谨慎使用）
# 在微信开发者工具中：工具 → 云开发 → 云函数 → 批量上传并部署
```

### 云开发控制台检查

1. 登录 [微信云开发控制台](https://console.cloud.weixin.qq.com)
2. 进入「云函数」页面
3. 确认函数状态为「部署成功」
4. 点击函数名 →「测试」→ 输入 event JSON 进行测试

### 日志查看

```javascript
// 云函数内打印日志
console.log('[qrscan] scan received:', { parent_id, qr_data });
console.warn('[qrscan] missing parent_id');
console.error('[qrscan] db error:', err);

// 在控制台查看：云函数 → 日志 → 按时间筛选
```

---

## 🐛 调试技巧

### 1. 本地调试（不推荐，云函数必须云端运行）

微信云函数的 `serverless` 特性导致本地调试困难，**建议直接使用云开发控制台的「测试」功能**。

### 2. 云开发控制台测试

```json
// 测试 event 示例
{
  "action": "scan",
  "parent_id": "parent_123",
  "qr_data": "medicine_001"
}
```

### 3. 查看完整错误

```javascript
// 在 catch 块中打印完整错误
try {
  await db.collection('xxx').add({ data: {...} });
} catch (err) {
  console.error('[qrscan] full error:', JSON.stringify(err));
  return R.fail('db error: ' + err.message);
}
```

---

## 📋 新增云函数检查清单

完成开发后，逐项核对：

- [ ] 云函数入口文件包含 `cloud.init()` 和 `exports.main`
- [ ] 使用 `action` 模式进行路由分发
- [ ] 所有参数都有验证（`if (!xxx) return R.fail()`）
- [ ] 响应统一使用 `R.ok()` 和 `R.fail()`
- [ ] 数据库操作封装在 `common/db.js`（不直接在 index.js 写查询）
- [ ] 常量定义在 `common/constants.js`（魔法数字禁止出现）
- [ ] 时间戳使用 `db.serverDate()`（服务端时间）
- [ ] 去重逻辑：先 `remove().catch(()=>{})` 再 `add()`
- [ ] 错误处理包含 `try-catch` 并打印 `console.error`
- [ ] 已部署到云开发环境并测试通过
- [ ] 在小程序端 `utils/cloud-api.js` 添加调用方法（如需要）
- [ ] 在 `wechat-miniprogram/app.json` 注册新页面（如需要）

---

## 🔄 与后端 API 的协调

本项目采用 **双端架构**：
- **云函数**：适合简单 CRUD、定时任务、数据聚合（无服务器）
- **后端 API**（`backend/src/app.js`）：适合复杂业务逻辑、外部服务集成、需要中间件（auth、rate-limit）的场景

**选择原则**：
- ✅ 纯数据库操作 → 云函数
- ✅ 定时推送（用药提醒） → 云函数 + 定时触发器
- ✅ 第三方 API 调用（如天气、地图） → 后端 API
- ✅ 复杂计算（周报生成） → 后端 API 或定时云函数
- ✅ 文件上传/处理 → 云存储 + 云函数

---

## 📖 示例：扫码帮手云函数完整实现

### 1. 数据库方法（common/db.js）

```javascript
async scanQRCode({ parent_id, qr_type, qr_value, scanned_at }) {
  const db2 = db;
  const useDate = scanned_at || new Date().toISOString().slice(0, 10);

  // 去重：同一天同一二维码只保留最新扫描
  await db.collection('qr_scans')
    .where({ parent_id, qr_type, qr_value, scanned_date: useDate })
    .remove()
    .catch(() => {});

  const r = await db.collection('qr_scans').add({
    data: {
      parent_id,
      qr_type,           // 'medicine' | 'food' | 'product'
      qr_value,          // 二维码内容
      scanned_date: useDate,
      scanned_at: db2.serverDate()
    }
  });

  return { _id: r._id, parent_id, qr_type, qr_value, scanned_date: useDate };
},

async getQRScans(parent_id, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const r = await db.collection('qr_scans')
    .where({
      parent_id,
      scanned_date: db.command.gte(since)
    })
    .orderBy('scanned_at', 'desc')
    .limit(100)
    .get();
  return r.data;
}
```

### 2. 云函数入口（cloudfunctions/qrscan/index.js）

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');

exports.main = async (event, context) => {
  const db = getDB(cloud);
  const { action } = event;

  switch (action) {
    case 'scan': {
      const { parent_id, qr_type, qr_value } = event;
      if (!parent_id || !qr_type || !qr_value) {
        return R.fail('parent_id, qr_type, qr_value required');
      }
      const record = await db.scanQRCode({ parent_id, qr_type, qr_value });
      return R.ok({ scan: record });
    }

    case 'history': {
      const { parent_id, days = 30 } = event;
      if (!parent_id) return R.fail('parent_id required');
      const scans = await db.getQRScans(parent_id, parseInt(days));
      return R.ok({ scans, count: scans.length });
    }

    default:
      return R.fail('unknown action: ' + action);
  }
};
```

---

## 📚 参考资源

- [微信云开发官方文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- 项目现有云函数代码参考：
  - `cloudfunctions/medication/index.js`（完整 CRUD 示例）
  - `cloudfunctions/report/index.js`（复杂业务逻辑示例）
  - `cloudfunctions/werun/index.js`（简洁路由示例）
- 数据库模式参考：`backend/src/db/encryption-enabled.js`

---

**维护者**：Hermes Agent (老爪)  
**最后校验**：2026-04-18（基于 medication/report/werun 三个云函数反推规范）  
**下一步**：按此规范实现 `qrscan`（扫码帮手）和 `taxi`（叫车帮手）云函数
