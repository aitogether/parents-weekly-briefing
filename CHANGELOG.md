# Changelog
所有项目的版本变更记录在此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [v0.2.0] - 2026-04-19

### 新增功能
- 😊 情绪晴雨（Phase 2-1）
  - 5级情绪记录：😊积极 / 😐平淡 / 😢低落 / 😠生气 / 😰焦虑
  - 周报页面底部卡片集成（≤3步操作，每周记录1次）
  - 近4周趋势分析（持平/好转/下降）
  - 异常检测：连续2周低落自动提醒（红色提示"建议主动联系"）
- 数据库：emotion_logs Collection（11字段，3个索引）
- 云函数：emotion-log（无定时触发，前端调用）
- 前端：report页面集成情绪记录UI（5个大号表情按钮）
- 单元测试：28个测试用例，100%通过

### 技术实现
- 云函数运行时：Node.js 18.x
- 微信云开发SDK：wx-server-sdk ~2.6.3
- 测试框架：Node.js 原生assert
- 代码行数：云函数191行 + 前端修改662行

### 合规与安全
- ✅ 授权校验：emotion-log验证openid与child_id匹配
- ✅ 银发经济监管红线：低负担（每周1次）、隐私保护（仅5级编码）、周报制
- ✅ 医疗免责声明完整（"本产品不构成医疗建议"）
- ✅ 紧急情况提示（"紧急情况请拨打120"）
- ✅ 隐私保护：不记录具体事件、无文字/录音
- ✅ 数据加密：云数据库本地加密存储

### 修复与改进
- medication-reminder推送频率合规化：每日4次 → 每日2次（8:00 + 18:00）
- medication-reminder模板消息增加免责声明（thing4字段）
- report页面footer补充完整医疗免责声明（含紧急电话）
- emotion-log云函数增加权限验证（防止越权记录）

### 文档
- 技术方案：docs/design/emotion-mood.md
- 部署指南：docs/deployment/emotion-log.md（待创建）
- 数据库Schema：database/collections/emotion_logs.json

### 已知限制
- 情绪记录仅在周报页面，无独立入口（符合低负担）
- 历史查询限制52周（约1年）
- 去重精度：基于parent_id + week_start，不考虑时间差

### 后续计划
- Phase 2-2: 睡眠助手（手动记录+定时提醒）
- Phase 2-3: 就医陪诊（预约+流程跟踪）
- Phase 3: 扫码帮手、叫车帮手、防走失、骗子识别、煤气守护（暂缓P0场景）

---

## [v0.1.0] - 2026-04-19

### 新增功能
- 💊 用药提醒云函数（medication-reminder）
  - 定时触发：每天 8:00、13:00、18:00、22:00
  - 智能重复规则：支持 daily / weekdays / weekends / 自定义星期数组
  - 防重复发送机制（通过 reminder_logs 集合）
  - 完整的错误处理和结构化日志
- 数据库支持：medication_plans、medication_records、reminder_logs 3个Collection
- 单元测试：29个测试用例，100%通过

### 技术实现
- 云函数运行时：Node.js 18.x
- 微信云开发SDK：wx-server-sdk ~2.6.3
- 测试框架：Node.js 原生assert
- 代码行数：393行（云函数核心）

### 合规与安全
- ✅ 银发经济监管红线检查通过
- ✅ 医疗免责声明完整（"本产品不构成医疗建议"）
- ✅ 无硬编码密钥，使用环境变量配置模板ID
- ✅ 数据库参数化查询，无SQL注入风险
- ✅ 完善的try-catch错误处理

### 文档
- 部署指南：docs/deployment/medication-reminder.md
- 测试用例：test/medication-reminder.test.js
- 数据库Schema设计：database/collections/ 已设计14个Collection
- 脚本：scripts/deploy-medication-reminder.sh

### 已知问题
- 前端用药管理页面尚未集成（待Phase 2）
- 订阅消息授权流程需在小程序端实现
- 需要手动配置云开发环境和模板ID

### 后续计划
- 前端集成：用药管理页面（计划列表 + 添加/编辑 + 确认服用）
- 周报整合：用药依从率统计展示
- 其他MVP：防走失、骗子识别、煤气守护（按优先级推进）

---

## [Unreleased] - 待发布

### 计划中功能
- 🔄 情绪晴雨（Phase 2-1）→ v0.2.0
- 🔄 睡眠助手（Phase 2-2）
- 🔄 就医陪诊（Phase 2-3）
- 🔄 防走失定位（P0，暂缓P3）
- 🔄 骗子识别预警（P0，暂缓P3）
- 🔄 煤气守护（P0，暂缓P3）
- 🔄 扫码帮手（P1，暂缓P3）
- 🔄 叫车帮手（P1，暂缓P3）
