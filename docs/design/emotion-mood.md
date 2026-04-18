# 情绪晴雨功能技术方案

## 1. 概述

### 1.1 功能背景
为"父母这一周"小程序新增情绪记录功能，让子女每周可在周报页面为父母记录一次情绪状态，用于生成情绪总结、趋势分析和异常提醒。

### 1.2 银发经济原则对齐
- **低负担**：每周仅需1次点击记录，无需输入文字
- **隐私保护**：不记录具体事件、无文字说明、无录音，仅存储5级情绪编码
- **周报制**：与周报流程集成，形成"查看周报 → 记录情绪"的闭环

---

## 2. emotion_logs 数据库 Schema 设计

### 2.1 Collection 名称
`emotion_logs`

### 2.2 Schema 定义

```json
{
  "_id": "string",
  "parent_id": "string",
  "child_id": "string",
  "emotion_level": "number",
  "emotion_emoji": "string",
  "week_start": "string",
  "week_end": "string",
  "recorded_at": "date",
  "client_ip": "string",
  "created_at": "date",
  "updated_at": "date"
}
```

### 2.3 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| parent_id | string | 是 | 关联用户表，标识是哪位父母 |
| child_id | string | 否 | 记录操作的子女ID（可选） |
| emotion_level | number | 是 | 情绪等级：1=😊(积极), 2=😐(一般), 3=😢(低落), 4=😠(烦躁), 5=😰(焦虑) |
| emotion_emoji | string | 是 | 表情字符 |
| week_start | string | 是 | 周起始日期 YYYY-MM-DD |
| week_end | string | 是 | 周结束日期 YYYY-MM-DD |
| recorded_at | date | 是 | 记录时间戳 |
| client_ip | string | 否 | 用于去重（可选） |
| created_at | date | 是 | 服务器时间 |
| updated_at | date | 是 | 服务器时间 |

### 2.4 索引设计

1. 复合索引: { parent_id: 1, week_start: 1 }
2. 单字段索引: { emotion_level: 1 }
3. 复合索引: { parent_id: 1, created_at: -1 }

### 2.5 数据约束
- 每周仅保留最新记录（parent_id + week_start 去重）
- 情绪等级范围 1-5
- 不存储任何文字备注

---

## 3. emotion-log 云函数设计

### 3.1 基本信息
- 函数名: `emotion-log`
- 路径: `cloudfunctions/emotion-log/index.js`
- 触发方式: 前端调用
- 运行环境: Node.js 18

### 3.2 接口定义

请求参数:
```json
{
  "action": "log",
  "parent_id": "string",
  "child_id": "string",
  "emotion_level": "number",
  "week_start": "string",
  "client_ip": "string"
}
```

响应格式:
```json
{
  "success": true,
  "data": {
    "emotion_log_id": "string",
    "emotion_level": 1,
    "emotion_emoji": "😊",
    "week_start": "2026-03-30"
  }
}
```

### 3.3 核心逻辑

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

exports.main = async (event, context) => {
  const db = getDB(cloud);
  const { action, parent_id, child_id, emotion_level, week_start } = event;

  if (action !== 'log') return R.fail('unknown action');
  if (!parent_id) return R.fail('parent_id required');
  if (!emotion_level || emotion_level < 1 || emotion_level > 5) {
    return R.fail('emotion_level must be 1-5');
  }

  const weekStart = week_start || getWeekStart(new Date());
  const weekEnd = getWeekEnd(weekStart);

  const EMOJI_MAP = { 1: '😊', 2: '😐', 3: '😢', 4: '😠', 5: '😰' };
  const emoji = EMOJI_MAP[emotion_level];

  // 去重：删除同一周旧记录
  await db.collection('emotion_logs')
    .where({ parent_id, week_start: weekStart })
    .remove()
    .catch(() => {});

  const record = {
    parent_id,
    child_id: child_id || null,
    emotion_level,
    emotion_emoji: emoji,
    week_start: weekStart,
    week_end: weekEnd,
    recorded_at: new Date().toISOString(),
    created_at: db.serverDate(),
    updated_at: db.serverDate()
  };

  const r = await db.collection('emotion_logs').add({ data: record });

  return R.ok({
    emotion_log_id: r._id,
    emotion_level,
    emotion_emoji: emoji,
    week_start: weekStart
  });
};
```

---

## 4. 前端集成方案

### 4.1 修改文件
- `wechat-miniprogram/utils/cloud-api.js` - 新增 logEmotion 函数
- `wechat-miniprogram/pages/report/index.wxml` - 新增情绪卡片
- `wechat-miniprogram/pages/report/index.js` - 添加记录逻辑
- `wechat-miniprogram/pages/report/index.wxss` - 新增卡片样式

### 4.2 API 封装

```javascript
function logEmotion(parentId, emotionLevel, childId, weekStart) {
  const params = { action: 'log', parent_id: parentId, emotion_level: emotionLevel };
  if (childId) params.child_id = childId;
  if (weekStart) params.week_start = weekStart;
  return call('emotion-log', params);
}
```

### 4.3 WXML 关键片段

```xml
<view class="section emotion-card" wx:if="{{showEmotionCard}}">
  <view class="emotion-title">为父母记录本周情绪</view>
  <view class="emotion-desc">每周一次，点击选择表情</view>
  <view class="emotion-options">
    <view class="emoji-btn {{emotionLevel===1?'selected':''}}" data-level="1" bindtap="onSelectEmotion">
      <text class="emoji">😊</text><text class="emoji-label">积极</text>
    </view>
    <view class="emoji-btn {{emotionLevel===2?'selected':''}}" data-level="2" bindtap="onSelectEmotion">
      <text class="emoji">😐</text><text class="emoji-label">一般</text>
    </view>
    <view class="emoji-btn {{emotionLevel===3?'selected':''}}" data-level="3" bindtap="onSelectEmotion">
      <text class="emoji">😢</text><text class="emoji-label">低落</text>
    </view>
    <view class="emoji-btn {{emotionLevel===4?'selected':''}}" data-level="4" bindtap="onSelectEmotion">
      <text class="emoji">😠</text><text class="emoji-label">烦躁</text>
    </view>
    <view class="emoji-btn {{emotionLevel===5?'selected':''}}" data-level="5" bindtap="onSelectEmotion">
      <text class="emoji">😰</text><text class="emoji-label">焦虑</text>
    </view>
  </view>
  <button class="submit-emotion-btn" disabled="{{!emotionLevel}}" bindtap="onSubmitEmotion">
    记录本周情绪
  </button>
</view>
```

### 4.4 JS 逻辑关键函数

```javascript
data: { showEmotionCard: true, emotionLevel: 0, lastEmotion: null },

onLoad() {
  this.loadReport();
  this.loadLastEmotion();
},

async loadLastEmotion() {
  const res = await getApp().api.getEmotionHistory(parentId, 1);
  if (res.success && res.data.length > 0) {
    this.setData({ lastEmotion: res.data[0] });
  }
},

onSelectEmotion(e) {
  this.setData({ emotionLevel: parseInt(e.currentTarget.dataset.level) });
},

async onSubmitEmotion() {
  const res = await getApp().api.logEmotion(parentId, this.data.emotionLevel, childId, weekStart);
  if (res.success) {
    wx.showToast({ title: '记录成功' });
    this.setData({ showEmotionCard: false });
    this.loadReport();
  }
}
```

---

## 5. 周报展示逻辑

### 5.1 实时计算策略
每次进入周报时，前端调用 `getEmotionHistory(parentId, 4)` 获取近4周记录，实时计算趋势和异常。

### 5.2 趋势计算
```javascript
function calculateTrend(history) {
  if (history.length < 2) return '暂无趋势数据';
  const cur = history[0].emotion_level;
  const last = history[1].emotion_level;
  if (cur === last) return '与上周持平';
  if (cur < last) return '情绪好转';
  return '情绪下降';
}
```

### 5.3 异常检测
```javascript
function detectEmotionAlert(history) {
  if (history.length < 2) return null;
  const LOW = [3, 4, 5];
  const recent2 = history.slice(0, 2);
  if (recent2.every(w => LOW.includes(w.emotion_level))) {
    return { message: '父母近期情绪持续低落，建议主动联系' };
  }
  return null;
}
```

---

## 6. 技术风险与限制

### 6.1 数据一致性
**风险**：网络延迟导致情绪数据晚显示
**缓解**：并行请求，情绪数据失败不影响周报主体

### 6.2 隐私保护
**风险**：数据泄露风险
**缓解**：仅存5级编码，无文字描述；云数据库默认加密

### 6.3 误报风险
**风险**：连续低落提醒可能是记录遗漏
**缓解**：仅针对明确记录触发；提供误报反馈

### 6.4 性能
**风险**：数据量增长（万家长≈52万条/年）
**缓解**：复合索引 O(1) 查询；保留2年数据；limit(4)

---

## 7. 部署测试

### 7.1 云函数
```bash
cd cloudfunctions
mkdir emotion-log
# 创建 index.js、package.json
# 微信开发者工具上传部署
```

### 7.2 数据库
云开发控制台创建 `emotion_logs` 集合，添加3个索引。

### 7.3 前端测试
1. 修改 cloud-api.js 添加 logEmotion
2. 修改 report 页面 wxml/js/wxss
3. 开发者工具测试：选择表情 → 记录 → 显示成功 → 周报展示

---

## 8. 后续迭代
- Phase 2-2：父母端独立记录、情绪日历视图
- Phase 2-3：多维度情绪细分、关联分析、智能推送

---

## 9. 修订记录
2026-04-19 v1.0 初版创建

## 10. 附录
参考：cloudfunctions/report/index.js, backend/src/models/checklist.js
规范：云函数 async/await，R.fail()/R.ok() 返回
联系人：@diygun
