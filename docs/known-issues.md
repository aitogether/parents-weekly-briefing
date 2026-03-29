# Known Issues — 真机自测记录

## 已修复 (2026-03-29)

### 🔴 严重
| # | 问题 | 修复 |
|---|------|------|
| 1 | `weekly-report` WXML 用了 `data-sub` class 但 WXSS 定义的是 `data-small` → 数据副标题无样式 | 改为 `data-sub` |
| 2 | `weekly-report` WXML 用了 `v-line` class 但 WXSS 定义的是 `divider` → 分割线不可见 | 改为 `v-line` |
| 3 | `weekly-report` WXML 用了 `echo-btn` class 但 WXSS 定义的是 `echo-submit` → 发送按钮无样式 | 改为 `echo-btn` |
| 4 | `weekly-report` WXML 用了 `echo-label` class 但 WXSS 定义的是 `echo-title` → 回声标签无样式 | 改为 `echo-label` |
| 5 | `weekly-report` WXML 用了 `<view class="page">` 但 CSS 只有 `page` 标签选择器 → 容器无样式 | 添加 `.page` 类 |
| 6 | git rebase 导致 6 个页面目录被删除（daily-summary/medication-stats/settings/med-confirm/med-plans/report） | 从旧提交恢复 |
| 7 | git rebase 导致 images/ 和 utils/api.js 被删除 | 从旧提交恢复 |
| 8 | wechat-miniprogram/ 内缺失 project.config.json/app.wxss/privacy.json/sitemap.json | 从旧提交恢复 |

### 🟡 中等
| # | 问题 | 状态 |
|---|------|------|
| 9 | `bind/index.js` 的「测试：创建父母并绑定」按钮调用 `/api/auth/seed-parent`，但该路由已被移除 | ⚠️ 测试按钮会报 404，不影响主流程 |
| 10 | `parent/home/index.js` 的「今日确认」把 `med_am/meal/walk` 当 plan_id 提交，这些不是数据库中的真实计划 | ⚠️ 目前可用（confirmMed 不校验 plan_id 是否存在），但周报用药分析会把这些计入 |
| 11 | 周报中「爸」的数据全是 0（只有一个父母绑定，parentB = parentA 的副本） | 📝 MVP 限制，暂不处理 |

### 🟢 轻微
| # | 问题 | 状态 |
|---|------|------|
| 12 | `pages/report/` 存在但没有入口导航到它 | 📝 备用页面 |
| 13 | `privacy.json` 中 `support` URL 是占位符 `https://your-domain.com/privacy.html` | 📝 上架前需替换为真实 URL |
| 14 | 旧页面（daily-summary/medication-stats/settings 等）是之前的简单版本，未集成新的 API | 📝 后续迭代 |
| 15 | `wx.vibrateShort` 部分机型不支持 | ⚠️ 已加 `&&` 短路保护 |

## 待测试（真机预览后填写）

- [ ] 首页角色选择 → 登录 → 父母端全流程
- [ ] 首页角色选择 → 登录 → 子女绑定 → 周报全流程
- [ ] 父母「今日确认」按钮点击反馈
- [ ] 子女「去问候一下」→ 回声提交
- [ ] tabBar 四个 tab 切换
- [ ] 邀请码复制功能
- [ ] 文案是否清晰易懂（尤其对老年人）
- [ ] 页面加载速度
- [ ] 真机网络异常处理

## 登录流程注意

当前 `wx.login()` 获取的 code 有 5 分钟有效期。后端 mock 模式下直接用 code 当 open_id，不影响功能。
但真机预览时，`API_BASE_URL` 必须指向 Mac 内网 IP（如 `http://192.168.1.100:3000`），不能用 `127.0.0.1`。
