# 云开发迁移方案

## 现有 API → 云函数映射

| 现有路由 | 描述 | 云函数名 | action | 备注 |
|---------|------|---------|--------|------|
| POST /api/auth/login | 微信登录 | `login` | `login` | 用 cloudContext.OPENID 免 code2session |
| GET /api/auth/profile | 用户信息 | `login` | `profile` | |
| POST /api/auth/bind | 子女绑定父母 | `invite` | `bind` | |
| POST /api/auth/seed-parent | 测试创建父母 | `login` | `seedParent` | dev only |
| GET /api/feedback/options | 回声选项 | `feedback` | `options` | 静态数据 |
| POST /api/feedback | 提交回声 | `feedback` | `submit` | |
| GET /api/feedback/latest | 最新回声 | `feedback` | `latest` | |
| POST /api/med/plan | 创建用药计划 | `medication` | `createPlan` | |
| GET /api/med/plans | 获取用药计划 | `medication` | `getPlans` | |
| POST /api/med/confirm | 确认用药 | `medication` | `confirm` | |
| GET /api/med/stats | 用药统计 | `medication` | `stats` | |
| POST /api/report/generate | 生成周报 | `report` | `generate` | |
| POST /api/werun/decrypt | 注入步数(mock) | `werun` | `decrypt` | mock |
| GET /api/werun/steps | 查询步数 | `werun` | `getSteps` | |

## 云函数目录结构

```
project-root/
├── miniprogram/                    # 现有小程序代码
├── backend/                        # 现有 Node 后端（保留）
├── cloudfunctions/                 # 新增：云函数根目录
│   ├── login/                      # 登录 + 用户管理
│   │   ├── index.js
│   │   └── package.json
│   ├── invite/                     # 邀请码 + 绑定
│   │   ├── index.js
│   │   └── package.json
│   ├── medication/                 # 用药计划 + 确认
│   │   ├── index.js
│   │   └── package.json
│   ├── report/                     # 周报生成
│   │   ├── index.js
│   │   └── package.json
│   ├── feedback/                   # 子女回声
│   │   ├── index.js
│   │   └── package.json
│   ├── werun/                      # 微信运动
│   │   ├── index.js
│   │   └── package.json
│   └── common/                     # 公共工具模块
│       ├── db.js                   # 云数据库封装
│       ├── response.js             # 统一返回格式
│       └── constants.js            # 常量
└── project.config.json             # 项目配置（开启 cloudfunctionsRoot）
```

## 云数据库集合设计

| 集合名 | 说明 | 对应原 store.js |
|-------|------|----------------|
| users | 用户表 | users[] |
| medication_plans | 用药计划 | medication_plans[] |
| med_confirmations | 用药确认记录 | med_confirmations[] |
| werun_data | 微信运动数据 | werun_data[] |
| child_feedback | 子女回声 | child_feedback[] |

## 优势

1. **login 云函数直接用 `cloudContext.OPENID`**，不需要 code2session，省掉 appid/appsecret 配置
2. **云数据库自动 JSON**，不需要手动序列化
3. **无需自建服务器**，无 HTTPS/域名/备案问题
4. **免费额度**：云开发基础版足够 MVP 使用

## 迁移策略

- 保留 backend/ 目录，不删除
- 前端同时支持两种模式（通过 `API_MODE` 切换）
- 云函数优先，REST API 作为 fallback
