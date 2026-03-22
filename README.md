# 父母周报 · Parents Weekly Briefing

「父母周报」是给异地子女的一份每周一次的父母状态简报，让你在周五傍晚用 5 分钟知道：爸妈这周大概怎样、这个周末要不要做点什么。

### 这份周报写给谁？

- **高频焦虑型**：爸妈在老家，每次刷到老人健康/诈骗新闻就紧张，周报帮你把模糊不安变成清晰判断。
- **疲惫管理型**：爸妈已经被骗/生病多次，你身心俱疲，周报帮你减少无效电话、把精力用在真正需要的行动上。

---

## 示例：两封真实的周报

### 🟡 黄灯周

> **锁屏**：「妈整体稳定，爸活动量略降。」
>
> **周报摘抄**：「妈本周用药完成率 94%，周三周四血压略高；爸日均步数比上月少 28%。建议这周末回去看看，或者打个电话问问妈最近睡得好不好。」
>
> **你可能好奇的**：「爸周六出门只有 412 步——那天他在忙什么？」

### 🟢 绿灯周

> **锁屏**：「爸妈这周都挺好。放心忙你的。」
>
> **周报摘抄**：「妈的血压和用药是这几周最好的一次；爸的步数回到上月水平。周末如果有空，打个电话不聊身体，聊点家常。」
>
> **你可能好奇的**：「爸周六 2,300 步——这天他明显出门了。去哪了？跟谁？」

### 周报解决什么问题？

- 从「每周一堆重复确认电话」→「有数据底气的一次有效对话」
- 从「看完老人新闻就心慌」→「知道爸妈最近有没有偏离自己的 baseline」
- 从「不知道跟爸妈聊什么」→「数据长出的自然话题」

---

## 实现概览

- **子女端**：微信小程序，负责展示周报、每日中午小结、子女反馈。
- **老人端**：同一小程序/服务号入口，负责用药计划的提醒与确认。
- **后端**：REST API + OpenClaw，用 PRD 中的规则生成结构化周报。
- **数据**：只用微信运动步数 + 用药确认，全部境内存储，详见 [docs/privacy-and-security.md](docs/privacy-and-security.md)。

更多技术细节请参阅 `backend/README.md` 和 `docs/prd/parents-weekly-briefing-prd-p0.md`。

---

## Roadmap

- **P0（当前）**：完成微信小程序 MVP + 后端 API + 内测 5–10 名付费子女用户。
- **P1（规划中）**：引入更多数据源和独立 App。

---

## 仓库结构

```
parents-weekly-briefing/
├── README.md
├── docs/
│   ├── prd/
│   │   ├── parents-weekly-briefing-prd-p0.md        — P0 产品需求文档
│   │   ├── reverse-prd-grandcare-stackcare.md        — GrandCare / StackCare 反向 PRD（负面教科书）
│   │   ├── paper-demo-monday-morning.md              — 黄灯周纸上 Demo
│   │   └── paper-demo-green-light-week.md            — 绿灯周纸上 Demo
│   ├── privacy-and-security.md                       — P0 隐私与数据安全说明
│   └── sprint-backlog-p0-weekly-briefing.md          — Sprint Backlog
├── backend/
│   └── (预留：后端服务代码)
└── wechat-miniprogram/
    └── (预留：微信小程序代码)
```
