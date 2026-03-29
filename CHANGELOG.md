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
