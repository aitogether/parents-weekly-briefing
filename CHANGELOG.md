# 更新日志

## 2026-03-29

### 上架准备
- 后端 auth 从 mock 改为支持真实微信 code2session（无 appid 时自动降级 mock）
- 后端 app.js 支持 dotenv 环境变量配置
- 创建 `backend/.env.example` 配置模板
- 创建 `backend/src/auth/wechat.js` 微信登录模块
- 修复 `/api/medication` 路由前缀不匹配 → 改为 `/api/med`
- 前端 app.js API URL 支持环境切换
- 创建隐私政策页面 `pages/privacy/`
- 创建首页角色分流页面 `pages/index/`
- 创建父母端首页 `pages/parent/home/`
- 创建子女绑定页面 `pages/child/bind/`
- app.json 注册全部 11 个页面
- 修复微信开发者工具 CLI 脚本路径 bug

### 已验证
- 后端 API 全部通过测试（登录、邀请码、用药、周报、反馈）
- 微信开发者工具 CLI 替代脚本工作正常

### Bug 修复与恢复
- 修复 weekly-report CSS class 不匹配（data-sub/v-line/echo-btn/echo-label/.page）
- 从 git 历史恢复被 rebase 删除的 6 个页面目录
- 恢复 images/ 和 utils/api.js
- 恢复 project.config.json/app.wxss/privacy.json/sitemap.json
- 恢复 /api/auth/seed-parent 路由（bind 页面测试按钮依赖）
- 创建 docs/known-issues.md 记录全部排查发现

## 2026-03-29 — 云开发迁移方案

### 新增
- 创建 `cloudfunctions/` 目录结构（6 个云函数 + 公共模块）
- `login` 云函数：用 cloudContext.OPENID 免 code2session
- `invite` 云函数：邀请码绑定
- `medication` 云函数：用药计划 + 确认 + 统计
- `report` 云函数：周报生成（与 REST 版完全一致的逻辑）
- `feedback` 云函数：子女回声
- `werun` 云函数：微信运动数据
- `common/` 公共模块：db.js + response.js + constants.js
- `utils/cloud-api.js` 云函数调用封装
- `docs/cloud-migration-plan.md` 迁移方案文档
- `cloudfunctions-config.md` 云函数配置文档

### 前端改造
- `app.js` 支持 `API_MODE: 'cloud'|'rest'` 模式切换
- `pages/index/index.js` 登录适配云函数
- `pages/child/bind/index.js` 绑定适配云函数
- `pages/parent/home/index.js` 父母首页适配云函数
- `pages/child/weekly-report/index.js` 周报适配云函数
- `project.config.json` 增加 `cloudfunctionRoot` + `cloud: true`
