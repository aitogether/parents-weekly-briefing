# 后端服务开发指南 · Parents Weekly Briefing

**版本**：P0 内测版 v0.2  
**对应 API 版本**：v1  
**最后更新**：2026-04-16

---

## 📖 项目概述

父母周报后端是一个轻量级 Node.js 服务，提供以下核心能力：
- 微信运动步数接收与存储（模拟）
- 用药计划管理与确认
- 周报自动生成
- 回声消息传递

**技术选型**：Express + JSON 文件存储（P0）→ SQLite（P1）  
**部署环境**：微信云开发 Cloud Functions（P0 阶段也可本地运行）  
**测试状态**：基础 API 测试覆盖率达 70%+

---

## 🚀 快速启动

### 方式1：本地开发（推荐）

```bash
# 进入后端目录
cd parents-weekly-briefing/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env（详见下方"环境变量"章节）

# 启动开发服务器（支持热重载）
npm run dev

# 输出示例
# PWB backend listening on port 3000
# Data store initialized: backend/data.json
```

### 方式2：Docker（请扫码关注「父母周报」公众号，回复「内测咨询」）
### 方式3：云函数部署（请扫码关注「父母周报」公众号，回复「内测咨询」）

---

## 📡 API 文档

### 基础信息
- **Base URL**：`http://localhost:3000`（本地）或云函数 URL
- **协议**：RESTful JSON
- **认证**：当前 P0 阶段**无需认证**，P1 将引入 JWT
- **响应格式**：`{ success: boolean, data?: any, error?: string }`

---

### 1️⃣ 健康检查

**端点**：`GET /health`  
**说明**：服务存活检测，GitHub Actions 会用

**请求示例**：
```bash
curl http://localhost:3000/health
```

**响应示例**：
```json
{
  "status": "ok",
  "timestamp": "2026-04-16T12:00:00.000Z",
  "version": "0.2.0"
}
```

---

### 2️⃣ 微信运动相关

#### 2.1 解密步数（模拟微信运动数据）

**端点**：`POST /api/werun/decrypt`  
**说明**：接收微信运动加密数据，解密后存入数据库。P0 阶段为简化，此接口**直接生成随机步数**（模拟）。

**请求参数**：
```json
{
  "parent_id": "mom_001",      // 父母 ID
  "encrypted_data": "..."      // 微信加密数据（P0 阶段可为空）
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "parent_id": "mom_001",
    "steps": 8520,
    "date": "2026-04-15",
    "timestamp": "2026-04-15T08:00:00Z"
  }
}
```

#### 2.2 查询步数历史

**端点**：`GET /api/werun/steps`  
**参数**：
- `parent_id`（必需）：父母 ID
- `days`（可选，默认 7）：查询天数

**请求示例**：
```bash
curl "http://localhost:3000/api/werun/steps?parent_id=mom_001&days=7"
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "parent_id": "mom_001",
    "days": [
      { "date": "2026-04-15", "steps": 8520 },
      { "date": "2026-04-14", "steps": 10230 },
      ...
    ]
  }
}
```

---

### 3️⃣ 用药管理

#### 3.1 创建用药计划

**端点**：`POST /api/med/plan`  
**说明**：子女端调用，为父母设置用药计划

**请求参数**：
```json
{
  "parent_id": "mom_001",
  "nickname": "降压药",       // 药名昵称（保护隐私，不必写真名）
  "dosage": "1片",           // 剂量
  "schedule": "08:00,20:00" // 服药时间，逗号分隔
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "plan_id": "plan_abc123",
    "parent_id": "mom_001",
    "nickname": "降压药",
    "dosage": "1片",
    "schedule": ["08:00", "20:00"],
    "created_at": "2026-04-16T10:00:00Z"
  }
}
```

#### 3.2 确认用药（父母端操作）

**端点**：`POST /api/med/confirm`  
**权限**：仅 `role=parent` 可调用，子女角色会返回 403

**请求参数**：
```json
{
  "plan_id": "plan_abc123",
  "parent_id": "mom_001",
  "role": "parent",          // 角色：parent 或 child
  "status": "taken",         // taken / missed / skipped
  "date": "2026-04-15"       // 确认日期（默认今天）
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "confirmation_id": "conf_xyz789",
    "plan_id": "plan_abc123",
    "parent_id": "mom_001",
    "status": "taken",
    "date": "2026-04-15",
    "timestamp": "2026-04-15T12:05:00Z"
  }
}
```

#### 3.3 查询用药统计

**端点**：`GET /api/med/stats`  
**参数**：
- `parent_id`（必需）
- `days`（可选，默认 7）

**响应示例**：
```json
{
  "success": true,
  "data": {
    "parent_id": "mom_001",
    "total_plans": 14,       // 7天 × 2次/天
    "confirmed_count": 12,   // 实际确认次数
    "completion_rate": 85.7, // 完成率 (%)
    "daily_breakdown": [
      { "date": "2026-04-15", "expected": 2, "confirmed": 2 },
      { "date": "2026-04-14", "expected": 2, "confirmed": 1 }
    ]
  }
}
```

---

### 4️⃣ 周报生成

#### 4.1 生成周报

**端点**：`POST /api/report/generate`  
**说明**：每周五晚 8 点由定时任务触发，也可手动触发测试

**请求参数**：
```json
{
  "parent_a_id": "mom_001",
  "parent_b_id": "dad_001",  // 可选，如只有一位父母可省略
  "week_start": "2026-04-13", // 可选，默认本周一
  "week_end": "2026-04-19"    // 可选，默认本周日
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "report_id": "report_20260419_001",
    "parent_a": { "name": "妈妈", "avg_steps": 8520, "med_completion": 90.5 },
    "parent_b": { "name": "爸爸", "avg_steps": 12340, "med_completion": 100 },
    "summary_text": "爸妈这周走了 10430步/天，用药全勤 👍",
    "severity": "green",  // green / yellow / red
    "ai_suggestions": ["本周步数比上周+12%，继续保持！"],
    "generated_at": "2026-04-19T20:00:00Z"
  }
}
```

#### 4.2 查询周报历史

**端点**：`GET /api/report/latest?parent_id=mom_001`  
**说明**：获取最新一份周报（当前仅支持查最新）

---

### 5️⃣ 回声（Echo）消息

#### 5.1 发送回声

**端点**：`POST /api/echo/send`  
**说明**：子女端调用，向父母发送一句话问候

**请求参数**：
```json
{
  "from_child_id": "child_001",
  "to_parent_id": "mom_001",
  "message": "爸，步数涨了，不错！"
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "echo_id": "echo_abc123",
    "from": "child_001",
    "to": "mom_001",
    "message": "爸，步数涨了，不错！",
    "sent_at": "2026-04-19T21:00:00Z",
    "read_at": null
  }
}
```

#### 5.2 接收回声

**端点**：`GET /api/echo/received?parent_id=mom_001`  
**说明**：父母端调用，获取所有未读回声

**响应示例**：
```json
{
  "success": true,
  "data": {
    "unread_count": 2,
    "messages": [
      {
        "echo_id": "echo_abc123",
        "from_name": "小明",
        "message": "爸，步数涨了，不错！",
        "sent_at": "2026-04-19T21:00:00Z"
      }
    ]
  }
}
```

---

## 🗄️ 数据存储

### P0 阶段：JSON 文件存储

**文件位置**：`backend/data.json`  
**结构**：
```json
{
  "parents": {
    "mom_001": {
      "id": "mom_001",
      "name": "妈妈",
      "child_id": "child_001",
      "med_plans": [...],
      "steps": [...],
      "created_at": "..."
    }
  },
  "med_confirmations": [...],
  "reports": [...],
  "echoes": [...]
}
```

**特点**：
- ✅ 零配置，开箱即用
- ✅ 所有数据持久化到单个 JSON 文件
- ❌ 不支持并发写入
- ❌ 大数据量性能差（>1万条记录需迁移）

### P1 阶段：SQLite（计划中）

`src/db/store.js` 已抽象数据访问层，迁移仅需替换实现文件，API 不变。

---

## ⚙️ 环境变量

复制 `.env.example` 为 `.env`，配置以下变量：

| 变量名 | 说明 | 默认值 | 是否必需 |
|--------|------|--------|----------|
| `PORT` | 服务端口 | `3000` | 否 |
| `NODE_ENV` | 运行环境 | `development` | 否 |
| `DATA_FILE` | JSON 数据文件路径 | `./data.json` | 否 |
| `JWT_SECRET` | JWT 签名密钥（P1 启用） | `dev-secret-change-me` | 否（P0） |
| `WECHAT_APP_ID` | 微信小程序 AppID | - | 是（云函数调用） |
| `WECHAT_APP_SECRET` | 微信小程序密钥 | - | 是（云函数调用） |

---

## 🧪 测试

### 运行测试套件

```bash
cd backend

# 运行所有测试
npm test

# 只运行单元测试
npm run test:unit

# 只运行 API 测试（需先启动服务）
npm run test:api

# 查看覆盖率
npm run test:coverage
```

### 测试数据隔离

测试使用独立数据文件 `backend/test-data.json`，不会污染生产数据。测试结束后自动清理。

---

## 🚢 部署

### 本地运行（P0 内测）

```bash
cd backend
npm start
# 服务运行在 http://localhost:3000
```

### 云函数部署（P1 阶段）

请扫码关注「父母周报」公众号，回复「内测咨询」。

### GitHub Actions 自动部署

`.github/workflows/deploy.yml` 配置了自动部署流程：
- push 到 `main` 分支 → 自动运行测试 → 测试通过后部署到云函数

---

## 🔄 数据库迁移指南

从 JSON 文件迁移到 SQLite 的步骤：

1. 运行迁移脚本：`node scripts/migrate-json-to-sqlite.js`
2. 修改 `src/db/store.js` 为 SQLite 实现
3. 更新 `package.json` 依赖：`better-sqlite3`
4. 重新启动服务

---

## 🐛 调试技巧

### 查看日志

```bash
# 开发模式下日志会直接输出到控制台
# 生产环境建议使用 winston + 文件日志
npm install winston
```

### 常见问题

**Q：端口 3000 被占用**  
A：修改 `.env` 中的 `PORT` 变量，或使用 `lsof -i :3000` 查找占用进程

**Q：data.json 写入失败**  
A：检查文件权限：`chmod 644 backend/data.json`

**Q：微信运动数据一直为 0**  
A：P0 阶段为模拟数据，步数在 3000-15000 随机生成。如需固定值，可修改 `src/werun.js` 中的 `generateMockSteps()` 函数。

---

## 📚 相关文档

- [产品需求文档](../docs/prd/product-requirements.md)
- [内测使用手册](../docs/pilot-manual.md)
- [API 接口设计](../docs/prd/api-design.md)（请扫码关注「父母周报」公众号，回复「内测咨询」）
- [数据模型](../docs/prd/data-model.md)（请扫码关注「父母周报」公众号，回复「内测咨询」）

---

**维护者**：[aitogether](https://github.com/aitogether)  
**许可证**：CC BY-NC 4.0
