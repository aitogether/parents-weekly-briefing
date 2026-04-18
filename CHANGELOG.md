# 更新日志
## 2026-04-16 — Beta 测试准备阶段

### 📚 文档完善
- 重写 README.md：添加故事化叙述、用户画像、Beta 招募流程
- 新增 `docs/pilot-manual.md`：完整的内测家庭使用指南（含截图指引）
- 新增 `docs/privacy-simple-zh.md`：简洁版数据承诺说明（面向非技术用户）
- 新增 `docs/faq.md`：8-10 个常见问题（Beta  tester 关心的问题）
- 新增 `CONTRIBUTING.md`：开发者贡献指南
- 更新 `backend/README.md`：扩展为完整的 API 文档 + 本地开发说明（7265 字符）
- 新增 `wechat-miniprogram/README.md`：微信开发者工具完整设置指南（5833 字符）
- 修复 README 中的断链：`docs/prd/product-requirements.md` → `docs/prd/parents-weekly-briefing-prd-p0.md`
- 删除临时测试文件 `docs/test.md`

### 🎯 Beta 招募目标
- 目标：5-10 个家庭（异地子女 + 年迈父母）
- 周期：2 周
- 核心场景验证：
  1. 父母每日服药确认流程
  2. 子女每周查看周报
  3. 子女向父母发送留言（回声消息）

---


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
