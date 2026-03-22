# PWB Backend

父母周报后端服务。

- Node.js + Express
- 提供 `/health` 和 `/v1/weekly-briefing/generate`（mock 数据）接口。

## 启动

```bash
cd backend
npm install
npm start
```

## 接口

### GET /health

健康检查，返回 `{ status: 'ok' }`。

### POST /v1/weekly-briefing/generate

生成一份周报。请求体 `{ userId: "xxx" }`，返回符合 PRD §6 结构的 JSON。

P0 阶段返回 mock 数据，P1 接入真实数据源。
