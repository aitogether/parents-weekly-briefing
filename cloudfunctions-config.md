# 云函数配置文档

## 概述

本项目将原 Node.js 后端（`backend/`）的部分逻辑迁移到微信云开发（云函数 + 云数据库）。

## 云函数列表

| 云函数 | 原 REST 路由 | 入参 | 说明 |
|--------|-------------|------|------|
| `login` | POST /api/auth/login | `{ action:'login', role, nickname }` | 微信登录，自动获取 OPENID |
| `login` | GET /api/auth/profile | `{ action:'profile' }` | 获取用户信息 |
| `login` | POST /api/auth/seed-parent | `{ action:'seedParent', nickname }` | 测试用创建父母 |
| `invite` | POST /api/auth/bind | `{ action:'bind', invite_code }` | 子女绑定父母 |
| `medication` | POST /api/med/plan | `{ action:'createPlan', parent_id, nickname, dosage, schedule }` | 创建用药计划 |
| `medication` | GET /api/med/plans | `{ action:'getPlans', parent_id }` | 获取用药计划 |
| `medication` | POST /api/med/confirm | `{ action:'confirm', plan_id, parent_id, role, status }` | 确认用药 |
| `medication` | GET /api/med/stats | `{ action:'stats', parent_id, days }` | 用药统计 |
| `report` | POST /api/report/generate | `{ action:'generate', parent_a_id, parent_b_id }` | 生成周报 |
| `feedback` | GET /api/feedback/options | `{ action:'options' }` | 回声选项 |
| `feedback` | POST /api/feedback | `{ action:'submit', child_id, parent_id, feedback_type }` | 提交回声 |
| `feedback` | GET /api/feedback/latest | `{ action:'latest', parent_id }` | 最新回声 |
| `werun` | POST /api/werun/decrypt | `{ action:'decrypt', parent_id, steps, data_date }` | 注入步数 |
| `werun` | GET /api/werun/steps | `{ action:'getSteps', parent_id, days }` | 查询步数 |

## 前端调用方式

```js
const app = getApp();

// 云函数模式（推荐）
const res = await app.api.login('parent');

// REST 模式（保留）
// app.globalData.API_MODE = 'rest' 时自动走 wx.request
```

## 初始化步骤

1. 在微信开发者工具中打开项目（选择 `wechat-miniprogram/` 目录）
2. 确认 `project.config.json` 中 `cloudfunctionRoot` 指向 `../cloudfunctions/`
3. 在云开发控制台创建以下数据库集合：
   - `users`
   - `medication_plans`
   - `med_confirmations`
   - `werun_data`
   - `child_feedback`
4. 在 `app.js` 中修改 `CLOUD_ENV` 为你的云开发环境 ID
5. 右键每个云函数目录 → 「上传并部署」
