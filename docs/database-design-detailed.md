# 数据库详细设计文档（CloudBase 云开发）

**项目**：父母这一周  
**版本**：v1.0 - Phase 1  
**日期**：2026-04-16  
**状态**：技术设计草案

---

## 📐 设计总览

### 技术栈
- **平台**：微信云开发（Tencent CloudBase）
- **数据库**：CloudBase Database（NoSQL，MongoDB 兼容）
- **存储**：CloudBase Storage（图片、文件）
- **权限**：基于角色的访问控制（RBAC）

### 设计原则
1. **最小权限**：每个 Collection 按角色设置读写权限
2. **数据隔离**：家庭之间数据完全隔离
3. **索引优化**：高频查询字段建立索引
4. **冷热分离**：历史数据定期归档

---

## 🗂️ Collection 总览（9个）

| 编号 | Collection 名称 | 用途 | 预估容量（100家庭/年） | 访问频率 |
|------|----------------|------|----------------------|----------|
| 1 | `users` | 用户基本信息 | 200 条 | 高 |
| 2 | `parents` | 父母档案 | 100 条 | 中 |
| 3 | `medication_plans` | 用药计划 | 3,650 条 | 高 |
| 4 | `medication_records` | 用药记录 | 10,950 条 | 高 |
| 5 | `reports` | 周报记录 | 5,200 条 | 中 |
| 6 | `feedback` | 用户反馈 | 500 条 | 低 |
| 7 | `location_history` | 位置历史 | 50,000 条 | 中 |
| 8 | `geo_fences` | 电子围栏 | 300 条 | 低 |
| 9 | `sos_events` | 紧急事件 | 200 条 | 低 |
| 10 | `ride_orders` | 出行订单 | 1,000 条 | 中 |
| 11 | `ride_locations` | 行程轨迹 | 30,000 条 | 高 |
| 12 | `scan_requests` | 扫码求助 | 2,000 条 | 中 |
| 13 | `secure_calls` | 诈骗电话记录 | 500 条 | 中 |
| 14 | `safety_events` | 安全事件 | 300 条 | 低 |

**总计**：~14 个 Collection，预估数据量 **~100MB/年**（在免费额度内）

---

## 📊 Collection 详细设计

---

### 1️⃣ `users` - 用户基本信息

**用途**：存储子女和父母的微信基础信息  
**读写权限**：仅创建者自己可读写（测试期：所有用户可读）  
**TTL**：永不过期（账户级数据）

```json
{
  "_id": "user_001",           // 自动生成
  "openid": "o6zAJs8SG8QE2euTynWtmxd_zcfs",  // 微信 openid（主键）
  "unionId": "union_123",      // 微信 unionId（如有）
  "role": "child",            // child / parent
  "nickname": "张伟",
  "avatarUrl": "https://...",
  "phoneNumber": "+86 138****5678",  // 可选，需用户授权
  "email": "zhangwei@example.com",   // 可选
  "familyId": "family_001",   // 家庭 ID（关联多个用户）
  "boundTo": ["parent_001"],  // 绑定的父母 ID（子女端有）
  "boundBy": "child_001",     // 绑定我的子女 ID（父母端有）
  "settings": {
    "notification": true,     // 接收通知
    "weeklyReport": true,     // 接收周报
    "quietHours": "22:00-06:00" // 勿扰时段
  },
  "createdAt": "2026-04-10T08:00:00Z",
  "updatedAt": "2026-04-10T08:00:00Z",
  "lastLoginAt": "2026-04-15T14:30:00Z"
}
```

**索引**：
```javascript
// 已内置 _id 索引
db.collection('users').createIndex({ openid: 1 })           // 登录查询
db.collection('users').createIndex({ familyId: 1 })         // 家庭查询
db.collection('users').createIndex({ role: 1, familyId: 1 }) // 家庭成员列表
```

**权限规则（数据库权限配置）**：
```json
{
  "read": "doc.openid == auth.openid || doc.familyId in query.familyIds",
  "write": "doc.openid == auth.openid"
}
```

---

### 2️⃣ `parents` - 父母档案

**用途**：存储父母的详细档案（健康信息、联系人等）  
**读写权限**：仅绑定的子女可写，父母可读自己的  
**TTL**：永不过期

```json
{
  "_id": "parent_001",
  "parentId": "user_parent_123",  // 关联 users.openid
  "childId": "user_child_456",    // 绑定的子女 openid
  "familyId": "family_001",
  
  // 基本信息
  "name": "张建国",
  "gender": "male",
  "birthday": "1958-03-15",
  "age": 68,
  "idCard": "11010119580315XXXX",  // 加密存储（可选）
  
  // 健康信息
  "chronicDiseases": ["高血压", "糖尿病"],  // 慢性病
  "allergies": ["青霉素"],                   // 过敏史
  "medications": [
    { "name": "降压药", "dosage": "1片", "frequency": "daily" },
    { "name": "二甲双胍", "dosage": "2片", "frequency": "daily" }
  ],
  "emergencyContact": {
    "name": "张伟（儿子）",
    "relation": "儿子",
    "phone": "13800138000",
    "wechat": "zhangwei_wx"
  },
  
  // 居住信息
  "address": "北京市朝阳区XX路123号",
  "homeGPS": { "lat": 39.9042, "lng": 116.4074 },
  "livingAlone": true,
  "hasGasSensor": false,  // 是否有燃气传感器
  
  // 设备信息
  "deviceInfo": {
    "phoneModel": "iPhone 12",
    "osVersion": "iOS 15.0",
    "wechatVersion": "8.0.40"
  },
  
  "createdAt": "2026-04-10T08:00:00Z",
  "updatedAt": "2026-04-10T08:00:00Z"
}
```

**索引**：
```javascript
db.collection('parents').createIndex({ parentId: 1 })
db.collection('parents').createIndex({ childId: 1 })
db.collection('parents').createIndex({ familyId: 1 })
```

---

### 3️⃣ `medication_plans` - 用药计划

**用途**：存储父母的所有用药计划（由子女创建）  
**读写权限**：创建者（子女）可读写，父母可读  
**TTL**：永不过期（除非标记为 `enabled: false`）

```json
{
  "_id": "plan_001",
  "planId": "plan_20260415001",  // 业务 ID：年月日+序号
  "parentId": "user_parent_123",
  "childId": "user_child_456",
  "familyId": "family_001",
  
  // 药物信息
  "medication": "降压药（苯磺酸氨氯地平片）",
  "medicationId": "med_001",    // 药物标准化 ID（可选）
  "dosage": "1片",
  "unit": "片",
  "frequency": "daily",         // daily/weekdays/weekends/custom
  "customDays": [1,2,3,4,5,6,7], // 自定义星期（1-7）
  
  // 时间设置
  "time": "08:00",
  "timeSlot": "morning",        // morning/noon/evening/night
  "reminderOffset": 0,          // 提前提醒分钟数（如 -15 表示提前 15 分钟）
  
  // 提醒配置
  "reminderType": "vibration+voice",  // vibration/voice/both
  "reminderEnabled": true,
  "reminderCount": 3,           // 提醒次数（最多 3 次）
  "reminderInterval": 30,       // 间隔（分钟）
  
  // 关联信息
  "prescriptionId": "presc_001", // 关联处方（可选）
  "notes": "饭后服用，避免剧烈运动",
  "attachments": [],            // 药盒照片、处方单
  
  // 状态
  "enabled": true,
  "startDate": "2026-04-10",
  "endDate": "2026-12-31",      // 可选，长期用药可为空
  
  "createdAt": "2026-04-10T08:00:00Z",
  "createdBy": "user_child_456",
  "updatedAt": "2026-04-10T08:00:00Z",
  "updatedBy": "user_child_456"
}
```

**索引**：
```javascript
db.collection('medication_plans').createIndex({ parentId: 1, time: 1 })      // 定时查询
db.collection('medication_plans').createIndex({ childId: 1, enabled: 1 })   // 子女管理
db.collection('medication_plans').createIndex({ planId: 1 })                // 业务查询
```

---

### 4️⃣ `medication_records` - 用药记录

**用途**：记录父母每次的服药情况  
**读写权限**：父母可创建，子女可读  
**TTL**：**180 天后自动删除**（隐私保护，不长期存储原始数据）

```json
{
  "_id": "record_001",
  "recordId": "rec_20260415001",
  "planId": "plan_001",
  "parentId": "user_parent_123",
  "childId": "user_child_456",
  
  // 服药信息
  "date": "2026-04-15",
  "scheduledTime": "08:00",
  "takenAt": "2026-04-15T08:02:00Z",  // 实际服药时间
  "status": "taken",        // taken / missed / delayed / skipped
  
  // 详情
  "dosage": "1片",
  "notes": "饭后服用，感觉良好",
  "hasSideEffect": false,   // 是否有不良反应
  
  // 同步状态
  "syncedToChild": true,
  "syncedAt": "2026-04-15T08:02:30Z",
  
  // 提醒记录
  "reminderSent": 1,        // 发送提醒次数
  "reminderTimes": ["08:00", "08:30"],
  
  "createdAt": "2026-04-15T08:00:00Z",
  "updatedAt": "2026-04-15T08:02:00Z"
}
```

**索引**：
```javascript
db.collection('medication_records').createIndex({ parentId: 1, date: -1 })   // 查询历史
db.collection('medication_records').createIndex({ planId: 1, date: 1 })     // 计划关联
db.collection('medication_records').createIndex({ status: 1, date: -1 })    // 异常查询
```

---

### 5️⃣ `reports` - 周报记录

**用途**：存储每周自动生成的健康简报  
**读写权限**：仅创建者（系统）可写，家庭内可读  
**TTL**：2 年后自动归档（可配置）

```json
{
  "_id": "report_001",
  "reportId": "report_2026-W15",
  "parentId": "user_parent_123",
  "childId": "user_child_456",
  "familyId": "family_001",
  
  // 报告元数据
  "weekNumber": 15,
  "year": 2026,
  "startDate": "2026-04-07",
  "endDate": "2026-04-13",
  "generatedAt": "2026-04-14T09:00:00Z",
  "status": "sent",  // draft/sent/read
  
  // 用药摘要
  "medicationSummary": {
    "totalPlanned": 21,
    "totalTaken": 18,
    "complianceRate": 85.7,
    "missedDays": 2,
    "missedDetails": [
      { "date": "2026-04-09", "reason": "忘记" },
      { "date": "2026-04-12", "reason": "外出" }
    ]
  },
  
  // 步数摘要
  "stepsSummary": {
    "totalSteps": 245678,
    "avgDaily": 35000,
    "vsLastWeek": "+12%",
    "activeDays": 6,  // 步数>1000的天数
    "inactiveDays": 1
  },
  
  // 情绪摘要
  "moodSummary": {
    "checkins": 6,
    "avgMood": 4,  // 1-5 分
    "negativeCount": 1,
    "negativeDetails": ["4月10日：头痛"]
  },
  
  // 安全事件
  "safetyIncidents": [
    {
      "type": "left_fence",
      "date": "2026-04-11",
      "description": "离开小区未报备，15分钟后返回",
      "resolved": true
    }
  ],
  
  // AI 洞察（OpenClaw 生成）
  "aiInsights": [
    {
      "type": "trend",
      "title": "服药依从性提升",
      "description": "本周服药率 85.7%，较上周提升 10%。建议继续保持。",
      "priority": "low"
    },
    {
      "type": "alert",
      "title": "周三步数显著下降",
      "description": "4月9日步数仅 1,200，需关注父母当日身体状况。",
      "priority": "medium"
    }
  ],
  
  // 子女互动
  "childInteraction": {
    "viewed": false,
    "viewedAt": null,
    "replied": false,
    "replyContent": null
  },
  
  "rawDataHash": "sha256:xxxxx"  // 原始数据哈希（可追溯）
}
```

**索引**：
```javascript
db.collection('reports').createIndex({ parentId: 1, weekNumber: -1 })  // 查询历史周报
db.collection('reports').createIndex({ childId: 1, status: 1 })        // 子女待读
db.collection('reports').createIndex({ reportId: 1 })                 // 业务查询
```

---

### 6️⃣ `feedback` - 用户反馈

**用途**：存储用户提交的反馈、bug 报告、建议  
**读写权限**：用户可创建，所有人可读（管理员处理）  
**TTL**：2 年后自动删除

```json
{
  "_id": "feedback_001",
  "feedbackId": "fb_20260415001",
  "userId": "user_child_456",      // 提交人
  "parentId": "user_parent_123",   // 关联父母（如有）
  
  // 反馈内容
  "type": "bug",                  // bug/suggestion/complaint/praise
  "category": "用药提醒",          // 功能模块
  "title": "用药提醒有时不推送",
  "description": "早上 8 点的提醒，有时延迟到 8:15 才收到",
  
  // 环境信息
  "appVersion": "1.0.0",
  "wechatVersion": "8.0.40",
  "os": "iOS 15.0",
  "device": "iPhone 12",
  "network": "WiFi",
  
  // 附件
  "attachments": [
    {
      "type": "screenshot",
      "url": "cloud://xxx.png",
      "size": 245000
    }
  ],
  
  // 处理状态
  "status": "pending",       // pending/reviewing/confirmed/closed
  "priority": "medium",      // low/medium/high
  "assignedTo": null,        // 处理人
  "response": null,          // 回复内容
  "responseAt": null,
  
  "createdAt": "2026-04-15T14:30:00Z",
  "updatedAt": "2026-04-15T14:30:00Z"
}
```

**索引**：
```javascript
db.collection('feedback').createIndex({ userId: 1, createdAt: -1 })
db.collection('feedback').createIndex({ type: 1, status: 1 })
db.collection('feedback').createIndex({ priority: 1, status: 1 })
```

---

### 7️⃣ `location_history` - 位置历史

**用途**：存储父母的定位记录（用于轨迹追踪、围栏判断）  
**读写权限**：仅系统可写，家庭成员可读  
**TTL**：**90 天后自动删除**（减少存储）

```json
{
  "_id": "loc_001",
  "parentId": "user_parent_123",
  "familyId": "family_001",
  
  "timestamp": "2026-04-15T09:30:00Z",
  "date": "2026-04-15",       // 用于按天聚合
  
  // GPS 坐标
  "type": "gps",              // gps/wifi/beidou/manual
  "latitude": 39.9042,
  "longitude": 116.4074,
  "accuracy": 20,             // 精度（米）
  "altitude": 50,             // 海拔（米）
  "speed": 0,                // 速度（km/h）
  "heading": 0,              // 方向（度）
  
  // 上下文
  "source": "auto_10min",    // auto_10min/manual/sos/geofence
  "batteryLevel": 85,
  "isCharging": false,
  "isOutdoor": true,
  "wifiSSID": "TP-Link_5G",
  
  // 围栏判断结果
  "fenceCheck": {
    "insideFences": ["fence_001", "fence_002"],
    "outsideFences": [],
    "triggerExit": false
  },
  
  "createdAt": "2026-04-15T09:30:00Z"
}
```

**索引**：
```javascript
db.collection('location_history').createIndex({ parentId: 1, timestamp: -1 })  // 查询最近位置
db.collection('location_history').createIndex({ parentId: 1, date: 1 })         // 按天聚合
db.collection('location_history').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 })  // TTL 90 天
```

---

### 8️⃣ `geo_fences` - 电子围栏

**用途**：存储父母常去区域（由子女设置）  
**读写权限**：绑定的子女可读写，父母可读  
**TTL**：永不过期

```json
{
  "_id": "fence_001",
  "fenceId": "fence_home",
  "parentId": "user_parent_123",
  "childId": "user_child_456",
  "familyId": "family_001",
  
  // 围栏信息
  "name": "家",
  "address": "北京市朝阳区XX路123号",
  "type": "home",           // home/work/market/other
  
  // 地理围栏
  "latitude": 39.9042,
  "longitude": 116.4074,
  "radius": 500,            // 半径（米）
  
  // 触发规则
  "notifyEntry": true,      // 进入时通知
  "notifyExit": true,       // 离开时通知
  "notifyDelay": 5,         // 延迟触发（分钟，防误报）
  
  // 时间限制
  "activeHours": "06:00-22:00",  // 仅在此时段监控
  "activeDays": [1,2,3,4,5,6,7], // 周几生效（1-7）
  
  "enabled": true,
  "createdAt": "2026-04-10T08:00:00Z",
  "updatedAt": "2026-04-10T08:00:00Z"
}
```

**索引**：
```javascript
db.collection('geo_fences').createIndex({ parentId: 1 })
db.collection('geo_fences').createIndex({ childId: 1, enabled: 1 })
```

---

### 9️⃣ `sos_events` - 紧急事件

**用途**：记录紧急求助事件（一键求助、长时间未确认）  
**读写权限**：仅系统可写，家庭成员可读  
**TTL**：**365 天后自动删除**

```json
{
  "_id": "sos_001",
  "eventId": "sos_202604151000",
  "parentId": "user_parent_123",
  "familyId": "family_001",
  
  "type": "location_request",  // location_request/emergency/geofence_breach
  "trigger": "manual",         // manual/auto/system
  
  // 位置信息
  "location": {
    "latitude": 39.9042,
    "longitude": 116.4074,
    "address": "朝阳公园",
    "accuracy": 30
  },
  
  // 通知记录
  "notifiedChildren": [
    { "childId": "user_child_456", "notifiedAt": "2026-04-15T10:00:00Z", "acknowledged": true, "acknowledgedAt": "2026-04-15T10:03:00Z" },
    { "childId": "user_child_457", "notifiedAt": "2026-04-15T10:00:10Z", "acknowledged": false, "acknowledgedAt": null }
  ],
  
  // 处理结果
  "resolution": {
    "resolved": true,
    "resolvedBy": "user_child_456",
    "resolvedAt": "2026-04-15T10:30:00Z",
    "actionTaken": "called_parent_confirm",  // called/called_110/remote_shutdown/acknowledged
    "notes": "父亲确认只是迷路，已导航接回"
  },
  
  "responseTime": 180,  // 首次响应时间（秒）
  "duration": 1800,     // 事件持续时长（秒）
  
  "createdAt": "2026-04-15T10:00:00Z",
  "resolvedAt": "2026-04-15T10:30:00Z"
}
```

**索引**：
```javascript
db.collection('sos_events').createIndex({ parentId: 1, createdAt: -1 })
db.collection('sos_events').createIndex({ type: 1, resolved: 1 })
db.collection('sos_events').createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 })  // TTL 1 年
```

---

### 🔟 `ride_orders` - 出行订单

**用途**：存储叫车订单信息  
**读写权限**：创建者（子女）可读写，父母可读  
**TTL**：**2 年后自动删除**

```json
{
  "_id": "order_001",
  "orderId": "DD123456789",
  "parentId": "user_parent_123",
  "childId": "user_child_456",
  
  "status": "completed",  // pending/ongoing/completed/cancelled
  
  // 行程信息
  "pickup": {
    "address": "幸福路123号",
    "lat": 39.9042,
    "lng": 116.4074
  },
  "dropoff": {
    "address": "市立医院",
    "lat": 39.9100,
    "lng": 116.4150
  },
  "distance": 6800,       // 米
  "estimatedDuration": 1080,  // 秒
  "actualDuration": 1100,
  
  // 司机信息
  "driver": {
    "name": "王师傅",
    "phone": "13800138000",
    "plateNumber": "京A·88888",
    "rating": 4.9,
    "avatarUrl": "..."
  },
  
  // 费用
  "estimatedPrice": 32.00,
  "actualPrice": 32.50,
  "currency": "CNY",
  "paymentMethod": "wechat_pay",  // wechat_pay/balance
  "paid": true,
  "invoiceUrl": "https://...",
  
  // 平台
  "platform": "gaode",     // didache/gaode/caocao
  "platformOrderId": "G123456",
  
  "createdAt": "2026-04-15T14:25:00Z",
  "startedAt": "2026-04-15T14:30:00Z",
  "completedAt": "2026-04-15T14:48:00Z",
  "cancelledAt": null
}
```

**索引**：
```javascript
db.collection('ride_orders').createIndex({ parentId: 1, createdAt: -1 })
db.collection('ride_orders').createIndex({ childId: 1, status: 1 })
db.collection('ride_orders').createIndex({ orderId: 1 })
db.collection('ride_orders').createIndex({ createdAt: 1 }, { expireAfterSeconds: 63072000 })  // TTL 2 年
```

---

### 1️⃣1️⃣ `ride_locations` - 行程轨迹

**用途**：存储行程中的实时位置点  
**读写权限**：仅系统可写，家庭成员可读  
**TTL**：**30 天后自动删除**

```json
{
  "_id": "loc_001",
  "orderId": "order_001",
  "parentId": "user_parent_123",
  
  "timestamp": "2026-04-15T14:35:00Z",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "speed": 35,           // km/h
  "heading": 90,         // 方向（度）
  "accuracy": 15         // 精度（米）
}
```

**索引**：
```javascript
db.collection('ride_locations').createIndex({ orderId: 1, timestamp: 1 })
db.collection('ride_locations').createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 })  // TTL 30 天
```

---

### 1️⃣2️⃣ `scan_requests` - 扫码求助

**用途**：记录扫码求助的完整流程  
**读写权限**：创建者可写，家庭成员可读  
**TTL**：**24 小时后自动删除**（隐私保护）

```json
{
  "_id": "scan_001",
  "requestId": "scan_202604151430",
  "parentId": "user_parent_123",
  "childId": "user_child_456",
  
  "type": "payment",      // payment/order/checkin/other
  "qrContent": "weixin://...",
  
  // 解析结果
  "parsed": {
    "merchant": "幸福路菜市场",
    "amount": 28.50,
    "timestamp": "2026-04-15T14:30:00Z",
    "currency": "CNY"
  },
  
  // 流程状态
  "status": "completed",  // pending/confirmed/paid/cancelled
  "parentMessage": "帮我看看这个多少钱",
  "childAction": "confirmed",  // confirmed/remote_pay/ask_more
  "childMessage": "可以付款，没问题",
  
  // 时间线
  "events": [
    { "event": "scan", "at": "2026-04-15T14:30:00Z" },
    { "event": "sent_to_child", "at": "2026-04-15T14:30:05Z" },
    { "event": "child_confirmed", "at": "2026-04-15T14:31:00Z" },
    { "event": "parent_paid", "at": "2026-04-15T14:31:30Z" }
  ],
  
  "createdAt": "2026-04-15T14:30:00Z",
  "resolvedAt": "2026-04-15T14:31:30Z"
}
```

**索引**：
```javascript
db.collection('scan_requests').createIndex({ parentId: 1, createdAt: -1 })
db.collection('scan_requests').createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })  // TTL 24h
```

---

### 1️⃣3️⃣ `secure_calls` - 诈骗电话记录

**用途**：记录来电识别和预警事件  
**读写权限**：仅系统可写，家庭成员可读  
**TTL**：**180 天后自动删除**

```json
{
  "_id": "call_001",
  "callId": "call_202604151425",
  "parentId": "user_parent_123",
  "familyId": "family_001",
  
  "phoneNumber": "13800138000",
  "callerId": "未知",       // 来电显示名称
  
  "incomingAt": "2026-04-15T14:25:00Z",
  "answered": false,        // 是否接听
  
  // 风险分析
  "riskLevel": "high",      // high/medium/low
  "fraudType": "impersonation_police",  // 诈骗类型
  "confidence": 0.92,       // 置信度（0-1）
  "source": "local_db",     // local_db/third_party/ai_model
  
  // 标记统计
  "markCount": 1234,        // 被标记次数
  "userReports": 45,        // 用户举报次数
  
  // 父母操作
  "parentAction": "help_request",  // confirmed/help/ignored/answered
  
  // 子女响应
  "childNotified": true,
  "notifiedChildren": ["user_child_456"],
  "childResponses": [
    { "childId": "user_child_456", "response": "confirmed", "respondedAt": "2026-04-15T14:25:30Z" }
  ],
  
  "duration": 0,  // 通话时长（秒）
  
  "createdAt": "2026-04-15T14:25:00Z"
}
```

**索引**：
```javascript
db.collection('secure_calls').createIndex({ parentId: 1, incomingAt: -1 })
db.collection('secure_calls').createIndex({ phoneNumber: 1, incomingAt: -1 })
db.collection('secure_calls').createIndex({ riskLevel: 1, createdAt: -1 })
```

---

### 1️⃣4️⃣ `safety_events` - 安全事件

**用途**：记录煤气泄漏、火灾、水浸等安全事件  
**读写权限**：仅系统可写，家庭成员可读  
**TTL**：**365 天后自动删除**

```json
{
  "_id": "event_001",
  "eventId": "safety_202604150830",
  "parentId": "user_parent_123",
  "familyId": "family_001",
  
  "type": "gas_leak",       // gas_leak/fire/flood/window_open
  "sensor": {
    "type": "gas",
    "value": 1200,          // 读数
    "unit": "ppm",
    "threshold": 500,       // 报警阈值
    "location": "kitchen"
  },
  
  "detectedAt": "2026-04-15T08:30:00Z",
  "acknowledgedAt": "2026-04-15T08:31:00Z",
  "resolvedAt": "2026-04-15T08:32:00Z",
  
  // 处理流程
  "parentAction": "acknowledged",  // acknowledged/ignored/call_for_help
  "childActions": [
    { "childId": "user_child_456", "action": "called_parent", "at": "2026-04-15T08:31:30Z" },
    { "childId": "user_child_456", "action": "remote_shutdown", "at": "2026-04-15T08:32:00Z" }
  ],
  
  "resolution": {
    "method": "manual_shutdown",  // manual/auto/remote
    "notes": "父亲关闭煤气阀门，开窗通风",
    "damage": "none"              // none/minor/major
  },
  
  "duration": 120,  // 事件持续时长（秒）
  
  "createdAt": "2026-04-15T08:30:00Z"
}
```

**索引**：
```javascript
db.collection('safety_events').createIndex({ parentId: 1, detectedAt: -1 })
db.collection('safety_events').createIndex({ type: 1, resolved: 1 })
```

---

## 🔐 权限配置（数据库规则）

### 默认策略：最小权限

```javascript
// 在云开发控制台 → 数据库 → 权限设置

// 1. users 集合
{
  "read": "doc.openid == auth.openid || doc.familyId in query.familyIds",
  "write": "doc.openid == auth.openid"
}

// 2. parents 集合
{
  "read": "doc.parentId == auth.openid || doc.childId == auth.openid",
  "write": "doc.childId == auth.openid"
}

// 3. medication_plans
{
  "read": "doc.parentId == auth.openid || doc.childId == auth.openid",
  "write": "doc.childId == auth.openid"
}

// 4. medication_records
{
  "read": "doc.parentId == auth.openid || doc.childId == auth.openid",
  "write": "doc.parentId == auth.openid"
}

// 5. reports
{
  "read": "doc.parentId == auth.openid || doc.childId == auth.openid",
  "write": "doc._openid == auth.openid"  // 仅系统可写
}

// 6. feedback
{
  "read": "true",  // 所有人可读（公开）
  "write": "doc.userId == auth.openid"
}

// 7. location_history
{
  "read": "doc.parentId == auth.openid || doc.familyId in query.familyIds",
  "write": "doc._openid == auth.openid"  // 仅系统写入
}

// 8. geo_fences
{
  "read": "doc.parentId == auth.openid || doc.childId == auth.openid",
  "write": "doc.childId == auth.openid"
}

// 9. sos_events
{
  "read": "doc.familyId in query.familyIds",
  "write": "doc._openid == auth.openid"  // 仅系统写入
}

// 10. ride_orders
{
  "read": "doc.parentId == auth.openid || doc.childId == auth.openid",
  "write": "doc.childId == auth.openid"
}

// 11. ride_locations
{
  "read": "doc.orderId in query.orderIds",  // 仅订单参与者
  "write": "doc._openid == auth.openid"
}

// 12. scan_requests
{
  "read": "doc.parentId == auth.openid || doc.childId == auth.openid",
  "write": "doc.parentId == auth.openid || doc.childId == auth.openid"
}

// 13. secure_calls
{
  "read": "doc.familyId in query.familyIds",
  "write": "doc._openid == auth.openid"
}

// 14. safety_events
{
  "read": "doc.familyId in query.familyIds",
  "write": "doc._openid == auth.openid"
}
```

---

## 📈 数据聚合视图（用于周报）

### 周报生成云函数逻辑

```javascript
// 每周一上午 9:00 触发
exports.generateWeeklyReport = async (event) => {
  const { parentId, weekNumber, year } = event;
  
  // 1. 查询本周数据
  const startDate = getMondayOfWeek(year, weekNumber);
  const endDate = addDays(startDate, 7);
  
  const medicationRecords = await db.collection('medication_records')
    .where({ parentId, date: db.command.gte(startDate).and(db.command.lte(endDate)) })
    .get();
  
  const locationPoints = await db.collection('location_history')
    .where({ parentId, date: db.command.gte(startDate).and(db.command.lte(endDate)) })
    .get();
  
  // 2. 计算统计指标
  const complianceRate = calcCompliance(medicationRecords);
  const avgSteps = calcAvgSteps(locationPoints);
  
  // 3. 生成 AI 洞察（调用 OpenClaw）
  const insights = await generateInsights({
    medication: medicationRecords,
    steps: locationPoints,
    parentId
  });
  
  // 4. 保存周报
  await db.collection('reports').add({
    data: {
      parentId,
      weekNumber,
      year,
      startDate,
      endDate,
      medicationSummary: { complianceRate, ... },
      stepsSummary: { avgSteps, ... },
      aiInsights: insights,
      status: 'draft',
      generatedAt: new Date()
    }
  });
  
  // 5. 推送给子女端
  await sendReportToChild(parentId, weekNumber);
  
  return { success: true };
};
```

---

## 🗑️ 数据生命周期管理

### 自动清理策略（TTL 索引）

| Collection | TTL | 原因 |
|------------|-----|------|
| `scan_requests` | 24 小时 | 扫码内容涉及隐私，不长期存储 |
| `ride_locations` | 30 天 | 轨迹数据敏感，短期即可 |
| `location_history` | 90 天 | 位置历史保留 3 个月足够 |
| `sos_events` | 1 年 | 紧急事件保留 1 年 |
| `safety_events` | 1 年 | 安全事件保留 1 年 |
| `secure_calls` | 180 天 | 通话记录 6 个月 |
| `medication_records` | 180 天 | 服药记录 6 个月（周报已聚合）|
| `feedback` | 2 年 | 反馈保留 2 年 |
| `ride_orders` | 2 年 | 订单保留 2 年（可查账）|
| `reports` | 2 年归档 | 周报 2 年后转为归档存储 |

### 归档策略

```javascript
// 每月 1 号执行归档任务
db.collection('reports')
  .where({ year: db.command.lt(currentYear - 2) })
  .update({ data: { archived: true } });
// 同时备份到 CloudBase Storage（压缩 JSON）
```

---

## 📊 容量规划与成本估算

### 数据量估算（100 个家庭，1 年）

| Collection | 日均写入 | 年总量 | 存储大小 |
|------------|----------|--------|----------|
| users | 0.5 条 | 180 条 | 10 KB |
| parents | 0.3 条 | 100 条 | 50 KB |
| medication_plans | 10 条 | 3,650 条 | 500 KB |
| medication_records | 30 条 | 10,950 条 | 3 MB |
| reports | 1.4 条 | 520 条 | 2 MB |
| location_history | 500 条 | 182,500 条 | 30 MB |
| ride_locations | 100 条 | 36,500 条 | 8 MB |
| 其他 | 10 条 | 3,650 条 | 1 MB |
| **总计** | **~652 条/天** | **~238,000 条** | **~45 MB** |

**结论**：100 家庭 1 年约 45 MB，**免费额度完全够用**（云开发免费 50 MB 数据库 + 5 GB 存储）。

---

## 🎯 下一步

### 步骤 B：云函数开发规范

接下来我会生成：
1. **云函数编码规范**（目录结构、命名、错误处理）
2. **公共工具库**（数据库操作、消息推送、日志）
3. **云函数部署清单**（环境变量、权限配置）
4. **监控与告警配置**（日志收集、异常通知）

**请确认是否继续？**
