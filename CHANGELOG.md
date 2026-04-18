# Changelog
所有项目的版本变更记录在此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
- 前端页面：用药计划列表、添加/编辑、确认服用
- 周报整合：用药依从率统计展示
- 其他MVP：防走失、骗子识别、煤气守护（按优先级推进）

---

## [Unreleased] - 待发布

### 计划中功能
- 🔄 防走失定位云函数
- 🔄 骗子识别预警系统
- 🔄 煤气守护传感器集成
- 🔄 扫码帮手快速入口
- 🔄 叫车帮手服务集成
