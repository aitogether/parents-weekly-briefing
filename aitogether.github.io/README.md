# 父母周报 · Parents Weekly Briefing

> **状态：2026-03 正在寻找 5–10 个愿意尝试的家庭内测。**

<p align="center">
  <img src="https://raw.githubusercontent.com/aitogether/parents-weekly-briefing-demo-app/main/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png" alt="App Icon" width="120"/>
</p>

<p align="center">
  <strong>让关心不再距离遥远</strong><br/>
  Weekly health briefing for families — gentle, respectful, no surveillance.
</p>

---

## 📸 Screenshots

| 周报详情 | 用药确认 | 用药计划 | 回声结果 |
| --- | --- | --- | --- |
| ![](ui-prototype/screenshots/phone-02-report.jpg) | ![](ui-prototype/screenshots/phone-03-med-confirm.jpg) | ![](ui-prototype/screenshots/phone-04-med-plan.jpg) | ![](ui-prototype/screenshots/phone-05-echo.jpg) |

> 📷 Android 模拟器截图（2026-03-31）。色板 v1.1。所有数据均为演示数据，不代表真实用户情况，也不构成任何医疗建议。

## 产品是什么？

父母周报是一个**轻量级家庭健康关怀工具**，面向异地子女和年迈父母：

| 角色 | 体验 |
|------|------|
| 👶 子女端 | 每周收到一份**黄灯周报**：父母步数趋势 + 用药情况 + AI 建议，一键发送「回声」 |
| 👴👵 父母端 | 大按钮确认用药，不需要打字，不需要学习新操作 |

**核心理念**：不是监控，是关心。用**周报**代替实时监控，用**一句话回声**代替长消息轰炸。

## 项目结构

```
parents-weekly-briefing/
## 项目结构

```
parents-weekly-briefing/
├── wechat-miniprogram/      # 微信小程序源码（✅ 当前推荐版本）
│   ├── pages/               #   小程序页面（report / parent / child 等）
│   ├── utils/               #   工具函数（API 封装、认证等）
│   ├── app.js               #   小程序入口，含 API_BASE_URL 配置
│   └── app.json             #   小程序全局配置
├── miniprogram/             # ⚠️ 旧版小程序，暂不推荐使用（已迁移到 wechat-miniprogram/）
├── backend/                 # Node.js 后端服务（Express + SQLite）
│   ├── src/                 #   源码（路由、控制器、数据库）
│   └── .env.example         #   环境变量模板
├── docs/                    # 产品文档 & 设计规范
│   ├── prd/                 #   PRD 文档
│   ├── ui/color-palette.md  #   全端色板规范
│   ├── design-brief.md      #   设计简报
│   ├── icon-guidelines.md   #   图标指南
│   └── roadmap.md           #   产品路线图
├── ui-prototype/            # HTML 高保真原型
│   ├── index.html           #   可直接打开的手机模拟器
│   └── screenshots/         #   真机截图
└── LICENSE                  # CC BY-NC 4.0 + 商业授权
```

## 快速开始
```

## 快速开始

### 后端服务

```bash
cd backend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库路径、API 密钥等配置

# 3. 启动开发服务器
npm run dev
# 默认监听 http://localhost:3000
```

### 微信小程序

1. 用微信开发者工具打开 `wechat-miniprogram/` 目录
2. 在 `utils/` 或项目配置中找到 API 地址，指向你刚启动的后端服务
3. 点击「编译预览」即可在模拟器中调试

> 💡 小程序默认连接本地后端。如需联调真机，确保手机和电脑在同一局域网，将 API 地址改为电脑 IP。

## 当前小程序状态

| 维度 | 状态 |
|------|------|
| 已实现页面 | 周报详情、用药确认、用药计划、回声结果（4 页） |
| 上架状态 | ❌ 未上架，处于小规模内测阶段 |
| 内测计划 | 2026 Q1 寻找 5–10 个真实家庭内测，收集反馈后迭代 |
| 下一步 | 云开发 PoC → 优化体验 → 提交审核上架 |

详细路线图 → [docs/roadmap.md](docs/roadmap.md)

## 快速体验

### HTML 原型
直接在浏览器打开 `ui-prototype/index.html`，即可看到完整的 4 个页面（周报/日结/用药/设置）。

### Demo App
独立的 Android 演示应用，纯本地假数据，不联网：
→ [parents-weekly-briefing-demo-app](https://github.com/aitogether/parents-weekly-briefing-demo-app)

## 本地一键跑起来

### 后端服务

```bash
cd backend
cp .env.example .env      # 复制环境变量模板，按需修改
npm install
npm run dev               # 启动开发服务器，默认监听 http://localhost:3000
```

### 微信小程序

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入项目：选择 `wechat-miniprogram/` 目录
3. AppID：使用「测试号」即可（无需真实 AppID）
4. 修改后端 API 地址：编辑 `wechat-miniprogram/app.js`，将 `API_BASE_URL` 改为你的后端地址（默认 `http://192.168.1.100:3000`）
5. 编译运行即可预览

## 配色方案

<p align="center">
  <img src="https://via.placeholder.com/80x80/20A080/ffffff?text=T" width="40"/> BrandTeal #20A080
  &nbsp;&nbsp;
  <img src="https://via.placeholder.com/80x80/70E090/ffffff?text=M" width="40"/> BrandMint #70E090
  &nbsp;&nbsp;
  <img src="https://via.placeholder.com/80x80/E84040/ffffff?text=R" width="40"/> HeartRed #E84040
</p>

完整色板定义 → [docs/ui/color-palette.md](docs/ui/color-palette.md)

---

## 🗺 Roadmap

未来 2–3 个月的产品计划，详见 [docs/roadmap.md](docs/roadmap.md)。

---

## Commercial use & branding

### Personal / non-commercial use

This project is open source and welcomes personal and non-commercial use.

If you are an individual using this project for yourself, your family, or non-profit / research purposes, you can use, modify, and deploy it freely under the [CC BY-NC 4.0](LICENSE) license.

We appreciate attribution (linking back to this repo), but it is not required for private use.

### Commercial use

If you plan to integrate this project into a paid product or service, or deploy it as part of a commercial offering (e.g. SaaS for caregivers, hospital / clinic deployments, insurance / eldercare bundles), **please contact the author to discuss a commercial license or revenue-sharing agreement**.

This helps sustain continued development and ensures the product is used in a way that respects the values behind "Parents Weekly Briefing".

### Branding & naming

The names 「父母周报」 and "Parents Weekly Briefing", as well as related logos / icons used in this repository, are reserved as project branding.

You may not use these names or logos in a way that suggests your product is the "official" Parents Weekly Briefing without prior written permission.

If you build on this project commercially, please use your own product name and branding, unless we explicitly agree otherwise.

### 联系 / Contact

For questions about acceptable use, commercial licensing, or partnership inquiries, feel free to open an issue or reach out directly.

---

## License

[CC BY-NC 4.0](LICENSE) — 个人非商业使用免费，商业使用请联系作者。

*个人随便用，赚钱要谈。*
