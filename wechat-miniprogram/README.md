# 父母周报 - 微信小程序

## 项目简介

「父母周报」是一款帮助子女远程关注父母健康状况的微信小程序。核心功能包括：

- **周报展示**：每周五推送，3 分钟了解父母本周健康状况
- **每日小结**：中午 12:15 推送绿灯/黄灯极简文案
- **用药管理**：老人端用药确认 + 子女端用药统计
- **子女反馈**：记录是否与父母沟通

## 项目结构

```
wechat-miniprogram/
├── app.js                    # 全局逻辑（API_BASE_URL、登录态管理）
├── app.json                  # 页面路由 & tabBar 配置
├── app.wxss                  # 全局样式
├── project.config.json       # 微信开发者工具项目配置
├── privacy.json              # 隐私政策弹窗配置
├── sitemap.json              # 小程序索引配置
├── utils/
│   └── api.js                # API 封装（统一请求、token、错误处理）
├── pages/
│   ├── child/                # 子女端页面
│   │   ├── weekly-report/    # 周报主页面（总评、关键事实、行动建议、反馈）
│   │   ├── daily-summary/    # 每日小结（状态色 + 一句话）
│   │   ├── medication-stats/ # 用药统计（完成率、漏服记录）
│   │   └── settings/         # 设置（通知开关）
│   └── parent/               # 老人端页面
│       ├── med-confirm/      # 用药确认（大按钮：已吃/不吃）
│       └── med-plans/        # 用药计划列表
└── images/                   # tabBar 图标（需自行添加）
```

## 在微信开发者工具中导入运行

### 前置准备

1. **安装微信开发者工具**：前往 [微信公众平台](https://mp.weixin.qq.com/) 下载安装
2. **注册小程序账号**：在微信公众平台注册小程序，获取 AppID

### 导入步骤

1. 打开微信开发者工具
2. 选择「导入项目」
3. 项目目录选择：`wechat-miniprogram/` 文件夹
4. 填入你的小程序 **AppID**（或选择「测试号」）
5. 项目名称：`父母周报`
6. 点击「导入」

### 配置后端 API

1. 打开 `app.js`
2. 修改 `API_BASE_URL` 为你的后端服务地址：
   ```js
   API_BASE_URL: 'https://your-api-domain.com'
   ```
3. 确保后端实现了以下接口（参见 `utils/api.js`）：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/weekly-report` | GET | 获取周报数据 |
| `/api/daily-summary` | GET | 获取每日小结 |
| `/api/medication-stats` | GET | 获取用药统计 |
| `/api/medication/confirm` | POST | 确认用药 |
| `/api/medication/plans` | GET/POST | 用药计划 CRUD |
| `/api/weekly-report/feedback` | POST | 子女反馈 |
| `/api/settings/notifications` | GET/PUT | 通知设置 |

### 添加 tabBar 图标

在 `images/` 目录下添加以下图标文件（建议 81x81 像素 PNG）：

- `tab-report.png` / `tab-report-active.png` — 周报
- `tab-daily.png` / `tab-daily-active.png` — 每日小结
- `tab-med.png` / `tab-med-active.png` — 用药统计
- `tab-settings.png` / `tab-settings-active.png` — 设置

### 调试提示

- **Mock 数据**：当前页面 JS 中包含 mock 数据，后端未就绪时可直接预览 UI
- **老人端入口**：老人端页面（`pages/parent/`）不在 tabBar 中，需要通过特定入口（如通知消息卡片）跳转
- **编译模式**：在开发者工具中可使用「添加编译模式」直接打开特定页面调试

### 发布上线

1. 在开发者工具中点击「上传」
2. 在微信公众平台提交审核
3. 审核通过后发布

## 技术栈

- 微信小程序原生框架（WXML + WXSS + JS）
- ES6+ 语法
- 无第三方依赖
