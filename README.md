# 父母周报 · Parents Weekly Briefing

给「每周至少焦虑一次父母身体/安全」的子女，在周一早上用 5 分钟完成「看完 → 决定本周要不要采取行动」的一周一次父母状态简报。

## 仓库结构

```
parents-weekly-briefing/
├── README.md
├── docs/
│   ├── prd/
│   │   ├── parents-weekly-briefing-prd-p0.md
│   │   ├── reverse-prd-grandcare-stackcare.md
│   │   ├── paper-demo-monday-morning.md
│   │   └── paper-demo-green-light-week.md
│   ├── privacy-and-security.md
│   └── sprint-backlog-p0-weekly-briefing.md
├── backend/
│   └── (预留：后端服务代码)
└── wechat-miniprogram/
    └── (预留：微信小程序代码)
```

- **`docs/prd/parents-weekly-briefing-prd-p0.md`** — P0 产品需求文档（目标用户、关键场景、数据源、周报结构、成功指标等）。
- **`docs/prd/reverse-prd-grandcare-stackcare.md`** — GrandCare / StackCare 反向 PRD（负面教科书，列出 8 条「我们不这么做」）。
- **`docs/prd/paper-demo-monday-morning.md`** — 黄灯周纸上 Demo：周一早上完整交互剧本（锁屏 → 周报 → 反馈 → 下周闭环）。
- **`docs/prd/paper-demo-green-light-week.md`** — 绿灯周纸上 Demo：在「一切正常」时，如何从数据里长出自然的话题，而不是废话。
- **`docs/privacy-and-security.md`** — P0 隐私与数据安全说明：只接入微信运动步数 + 父母手动用药确认，明确不读取聊天、不碰钱、不看定位。
- **`docs/sprint-backlog-p0-weekly-briefing.md`** — 2 周内测冲刺的 Sprint Backlog：10 个任务 + 4 个里程碑（数据通路 → 周报生成 → UI+通知 → 首批内测）。
- **`backend/`** — 预留：后端服务代码（REST API + OpenClaw 集成），后续按照 PRD 中的接口约定实现。
- **`wechat-miniprogram/`** — 预留：微信小程序代码（页面、配置、隐私弹窗等）。

## 实现规划（P0）

- **前端形态**：微信小程序
  - 子女在小程序中接收周报、查看细节、反馈「聊了/还没聊」。
  - 只使用微信运动步数 + 父母手动确认用药，不接入额外硬件（小米手环等）作为 P0 前提。

- **后端服务**：
  - 业务 API 服务：聚合微信运动和用药数据，根据 PRD §6 的规则生成结构化周报 JSON。
  - OpenClaw：作为规则/生成层，接收「周汇总特征」并输出周报文案结构。

- **数据与隐私**：
  - 所有数据加密存储在境内云服务器，仅用于周报生成和匿名统计。
  - 不读取聊天、通话内容，不接入银行/支付/医保数据，详见 `docs/privacy-and-security.md`。

## Roadmap（简要）

- **P0（当前）**：
  - 完成微信小程序 MVP + 后端 API + 内测 5–10 名付费子女用户。
- **P1（规划中）**：
  - 在验证 P0 成功指标后，考虑引入更多数据源（可穿戴设备、诈骗风险等）和独立 App。
