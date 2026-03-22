# Backend 快速验证指南

## 启动服务

```bash
cd parents-weekly-briefing/backend
npm install
npm start
# 输出: PWB backend listening on port 3000
```

## 接口测试（curl）

### 1. 健康检查
```bash
curl http://127.0.0.1:3000/health
# → {"status":"ok","timestamp":"..."}
```

### 2. 微信运动 mock
```bash
# 注入一条随机步数
curl -X POST http://127.0.0.1:3000/api/werun/decrypt \
  -H "Content-Type: application/json" \
  -d '{"parent_id":"mom_001"}'

# 查询步数
curl "http://127.0.0.1:3000/api/werun/steps?parent_id=mom_001&days=7"
```

### 3. 用药流程
```bash
# 创建用药计划
curl -X POST http://127.0.0.1:3000/api/med/plan \
  -H "Content-Type: application/json" \
  -d '{"parent_id":"mom_001","nickname":"降压药","dosage":"1片","schedule":"08:00,20:00"}'

# 老人确认「已吃」（role=parent）
curl -X POST http://127.0.0.1:3000/api/med/confirm \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"<上面返回的plan.id>","parent_id":"mom_001","role":"parent","status":"taken"}'

# 子女尝试确认 → 403 拒绝
curl -X POST http://127.0.0.1:3000/api/med/confirm \
  -H "Content-Type: application/json" \
  -d '{"plan_id":"<plan.id>","parent_id":"mom_001","role":"child","status":"taken"}'
# → {"error":"Only parent role can confirm medication"}

# 查询统计
curl "http://127.0.0.1:3000/api/med/stats?parent_id=mom_001&days=7"
```

### 4. 周报生成
```bash
# 注入一些数据后生成周报
curl -X POST http://127.0.0.1:3000/api/report/generate \
  -H "Content-Type: application/json" \
  -d '{"parent_a_id":"mom_001","parent_b_id":"dad_001"}'
```

## 数据存储

P0 阶段使用 `backend/data.json` 文件存储（JSON），无需数据库。每次写入操作会自动持久化。

## 后续替换

`src/db/store.js` 的接口设计与 SQLite 方案一致，后续可无缝替换为 better-sqlite3 或 PostgreSQL。
