# 色板规范 v1.0

> 所有端（Android Demo / HTML 原型 / 微信小程序）的唯一颜色来源。
> 改色前必须先更新本表，再同步到各端代码。

## 品牌主色

| 命名 | 色值 | 用途 |
|------|------|------|
| **BrandTeal** | `#20A080` | 主色 — 按钮、主标题、标签、状态栏、底部 Tab 激活态 |
| **BrandTealDark** | `#188068` | 按下/pressed — 按钮 hover、toggle 激活、深度强调 |
| **BrandTealLight** | `#E0F5EE` | 浅底 — 图标背景圈、选中态卡片、次要信息底色 |
| **BrandMint** | `#70E090` | 辅助色 — 次要按钮、进度条、活跃/成功标记 |
| **BrandMintLight** | `#F0FBF4` | 辅助浅底 — 轻量背景、渐变终点 |

## 中性色 / 功能色

| 命名 | 色值 | 用途 |
|------|------|------|
| **EchoBackground** | `#F0FAF6` | 页面整体背景色 |
| **CardBorder** | `#D1E8DE` | 卡片边框、分割线、Tab 栏顶边框 |
| **DarkGray** | `#374151` | 正文文字、标题文字 |
| **MediumGray** | `#6B7280` | 副标题、日期、说明文字 |
| **HeartRed** | `#E84040` | 心形图标、未绑定标记、"偏低/异常"警示 |

## 渐变

| 名称 | 起点 | 终点 | 用途 |
|------|------|------|------|
| 进度条渐变 | BrandMint `#70E090` | BrandTeal `#20A080` | 步数/服药率进度条 |
| 警示渐变 | HeartRed `#E84040` | `#F27070` | 偏低状态进度条 |

## 组件 → 颜色映射

| 组件 | 正常态 | 激活/按下态 | 浅底/背景态 |
|------|--------|------------|------------|
| 主按钮 | `bg-brand` `text-white` | `bg-brand-dark` | — |
| 次要按钮 | `border-cardBorder` `text-darkGray` | `border-brand` `text-brand` `bg-brand-light` | — |
| 卡片 | `bg-white` `border-cardBorder` | — | — |
| 图标背景圈 | `bg-brand-light` | — | `bg-mint-light`（辅助） |
| 状态标签-正常 | `bg-mint-light` `text-brand-dark` | — | — |
| 状态标签-警示 | `bg-red-50` `text-heart` | — | — |
| 进度条轨道 | `bg-brand-light` | — | — |
| 进度条填充 | `gradient mint→brand` | — | `gradient blush→heart`（偏低） |
| 底部 Tab 激活 | `text-brand` | — | — |
| 底部 Tab 未激活 | `text-gray-400` | — | — |
| 页面背景 | `bg-echoBg` | — | — |
| 回声爱心 | `text-heart` | — | — |
| Toggle 开关 | `bg-brand` | `bg-brand-dark` | — |

## 禁用色

以下颜色在本项目中**不再使用**，如发现遗留应立即替换：

| 旧色 | 色值 | 替换为 |
|------|------|--------|
| WarmAmber（暖橙） | `#EC7D14` | BrandTeal |
| WarmAmber 50-100（暖橙浅底） | `#FEF7EE` / `#FDEDD3` | BrandTealLight / EchoBackground |
| Sage（灰绿） | `#5A7F57` | BrandTeal |
| Blush 粉色系 | `#E04F6E` 等 | HeartRed（仅保留警示用途） |

---

## 各端代码对应文件

| 端 | 文件 | 色板定义方式 |
|----|------|-------------|
| Android Demo | `app/.../ui/theme/Color.kt` | Kotlin `val BrandTeal = Color(...)` |
| Android Demo | `app/.../ui/theme/Theme.kt` | Material 3 `lightColorScheme(...)` |
| HTML 原型 | `ui-prototype/index.html` | Tailwind 自定义色板 `colors.brand.*` |
| 微信小程序 | `miniprogram/styles/colors.wxss` | CSS 变量 `:root { --brand-teal: ... }` |
| 微信小程序 | `miniprogram/pages/*/report.wxss` | 引用 CSS 变量 |

---

*最后更新: 2026-03-24*
