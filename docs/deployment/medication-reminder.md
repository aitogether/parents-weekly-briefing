# 用药提醒云函数部署指南

## 概述

`medication-reminder` 是定时触发的云函数，用于在每天 8:00、13:00、18:00、22:00 向父母端发送用药提醒模板消息。

**合规声明：**
- 本产品不构成医疗建议
- 数据仅用于家庭关怀
- 紧急情况请拨打 120

## 前置要求

1. 已开通微信云开发（云函数 + 云数据库）
2. 已创建小程序并获取 AppID
3. 云开发环境 ID 已配置在 `wechat-miniprogram/app.js` 中

## 数据库集合准备

在云开发控制台创建以下集合（如已存在请跳过）：

### 1. medication_plans（用药计划）
已在 `cloudfunctions-config.md` 中定义，包含字段：
- `_id`: 计划ID
- `parent_id`: 父母用户ID
- `nickname`: 药品名称（加密）
- `dosage`: 用法用量（加密）
- `schedule`: 用药时间表（JSON字符串，加密）
  - 示例：`[{"time":"08:00","repeat":"daily"}]`
  - repeat 支持：`daily`, `weekdays`, `weekends`, 或 `["mon","tue","wed"]`
- `enabled`: 是否启用（布尔值）
- `created_at`: 创建时间

### 2. reminder_logs（提醒日志）- 新建
用于记录每次提醒的发送状态，避免重复发送。

字段：
```json
{
  "_id": "自动生成",
  "plan_id": "string",
  "parent_id": "string",
  "trigger_hour": 8,
  "trigger_date": "YYYY-MM-DD",
  "status": "sent|failed",
  "error_msg": "string (可选)",
  "created_at": "Date"
}
```

**创建步骤：**
1. 登录 [微信云开发控制台](https://console.cloud.weixin.qq.com)
2. 选择环境 → 数据库 → 添加集合
3. 集合名称：`reminder_logs`
4. 权限设置（建议）：
   - 所有用户可读，仅创建者可写（云函数使用管理员权限，不受限制）

### 3. users（用户表）
已存在，确保包含：
- `_id`: 用户ID
- `open_id`: 微信openId（用于发送模板消息）
- `role`: "child" | "parent"

## 配置模板消息

### 1. 申请模板
在微信公众平台（小程序）→ 功能 → 订阅消息 中申请模板。

**建议模板内容：**
- 模板名称：用药提醒
- 模板内容示例：
  - 药品名称：{{thing1.DATA}}
  - 提醒时间：{{time2.DATA}}
  - 用法用量：{{thing3.DATA}}
  - 温馨提示：本消息仅为用药提醒，不构成医疗建议

### 2. 获取 Template ID
审核通过后，复制模板 ID，例如：`xxxxxxxxxxxxxxxxxxxxxx`

### 3. 配置环境变量
在云函数 `medication-reminder` 的环境变量中设置：

| 键 | 值 | 说明 |
|----|----|----|
| `TEMPLATE_ID_MED_REMINDER` | `你的模板ID` | 用药提醒模板ID |

**设置方法：**
1. 微信开发者工具 → 云开发 → 云函数
2. 右键 `medication-reminder` → 环境变量
3. 添加键值对，保存

### 4. 配置小程序订阅消息权限
在小程序 `app.json` 中添加：
```json
{
  "requiredPrivateInfos": ["subscribeMessage"]
}
```
并在前端页面（如 `pages/medication/confirm`）调用 `wx.requestSubscribeMessage` 让父母授权订阅。

## 部署步骤

### 步骤 1：上传云函数代码

```bash
# 进入项目目录
cd /Users/diygun/parents-weekly-briefing

# 使用微信开发者工具右键上传，或使用命令行：
# 安装微信云开发 CLI
npm install -g @cloudbase/cli

# 登录（如果未登录）
tcb login

# 部署云函数
tcb functions:deploy medication-reminder --envId 你的环境ID
```

**推荐方式（微信开发者工具）：**
1. 打开微信开发者工具
2. 导入项目，目录选择 `wechat-miniprogram/`
3. 确保 `project.config.json` 中 `cloudfunctionRoot` 为 `../cloudfunctions/`
4. 在工具左侧找到 `cloudfunctions/medication-reminder/`
5. 右键 → 「上传并部署：云端安装依赖」

### 步骤 2：配置定时触发器

云函数部署后，需创建定时触发器：

**方法 A：通过云开发控制台**
1. 登录云开发控制台 → 云函数
2. 找到 `medication-reminder` → 触发器
3. 点击「新建触发器」
4. 选择类型：定时触发器
5. Cron 表达式：`0 0 8,13,18,22 * * *`
6. 保存

**方法 B：通过 CLI**
```bash
tcb functions:triggers:add medication-reminder --envId 你的环境ID \
  --type timer \
  --name medication-reminder-trigger \
  --config "0 0 8,13,18,22 * * *"
```

**Cron 表达式说明：**
- `0`：分钟（0分）
- `0`：小时（0分时，即整点）
- `8,13,18,22`：每天 8点、13点、18点、22点
- `*`：每月每一天
- `*`：每周每一天
- `*`：每年

### 步骤 3：配置数据库权限

在云开发控制台 → 数据库 → 权限设置：

- `medication_plans`：建议仅创建者可读写（数据隐私）
- `reminder_logs`：建议所有用户可读，仅创建者可写
- `users`：按需配置

**注意：** 云函数使用管理员权限访问数据库，不受权限规则限制。

### 步骤 4：验证部署

1. 在云开发控制台查看云函数列表，确认 `medication-reminder` 状态为「部署成功」
2. 点击「触发测试」，选择「自定义事件」（无需参数），测试执行
3. 查看日志（云函数 → 日志），确认无错误
4. 检查 `reminder_logs` 集合是否新增记录
5. 若配置了真实模板ID，父母端应在对应时间收到订阅消息

## 测试用例

参考 `test/medication-reminder.test.js` 文件，包含：
- 时间匹配测试
- 重复规则匹配测试
- 计划查询过滤测试
- 模板消息发送模拟

运行测试：
```bash
cd cloudfunctions/medication-reminder
npm test
```

## 常见问题

### Q1：云函数执行失败，提示「数据库连接失败」
A：确认 `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })` 正确，且云函数运行在微信云开发环境。

### Q2：模板消息发送失败
A：
1. 检查模板 ID 是否配置正确（环境变量）
2. 确认父母端已订阅该模板（需用户主动授权）
3. 检查 access_token 是否有效（云函数自动处理）
4. 查看日志中的具体错误信息

### Q3：重复发送提醒
A：检查 `reminder_logs` 集合的去重逻辑是否正确，确保同一计划在同一天同一小时只记录一次。

### Q4：某些计划没有提醒
A：
1. 确认计划的 `enabled` 为 true
2. 确认 `schedule` 字段格式正确（JSON 数组）
3. 检查当前小时是否在 `schedule` 的 `time` 中
4. 检查 `repeat` 规则是否包含今天

### Q5：如何修改提醒时间？
A：修改定时触发器的 Cron 表达式即可。例如改为每天 9点和21点：
```
0 0 9,21 * * *
```

## 监控与日志

### 查看日志
1. 微信云开发控制台 → 云函数 → `medication-reminder` → 日志
2. 或使用 CLI：
```bash
tcb functions:log medication-reminder --envId 你的环境ID
```

### 关键日志标识
- `[Reminder] 用药提醒云函数开始执行` - 函数启动
- `[Reminder] 触发 X点，共找到 Y 个需要提醒的计划` - 查询结果
- `[Reminder] 发送模板消息 ->` - 发送成功
- `[Reminder] 记录日志失败` - 需要排查数据库

### 告警建议
建议在云开发控制台配置云函数异常告警：
- 失败率 > 5%
- 执行时间 > 5s
- 连续失败 3 次

## 维护与更新

### 更新代码
1. 修改 `index.js`
2. 重新上传部署（覆盖即可）

### 回滚版本
在云开发控制台 → 云函数 → 版本管理 → 回滚到历史版本。

### 禁用定时触发
如需临时禁用，在触发器页面禁用即可，不会删除代码。

## 合规检查清单

- [x] 代码包含合规声明注释
- [x] 不涉及疾病诊断或风险预测
- [x] 不判断用药合理性
- [x] 不监测生命体征
- [x] 不推荐治疗方案
- [x] 不替代子女决策（仅提醒）
- [x] 包含「本产品不构成医疗建议」声明
- [x] 包含「紧急情况请拨打120」提示

## 相关文档

- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [订阅消息指引](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html)
- [项目云函数标准](docs/cloud-function-standards.md)
- [数据库设计](database/collections/)

---

**最后更新：** 2026-04-19
**维护者：** Nous Research Hermes Agent
