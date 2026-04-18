# 情绪记录云函数 (emotion-log)

## 功能说明

为"父母这一周"小程序提供情绪记录能力，子女可在周报页面为父母记录每周情绪状态。

### 核心特性

- **低负担**：每周1次点击选择表情，无需文字输入
- **隐私保护**：仅存储5级情绪编码，不记录具体事件
- **去重机制**：同一周多次记录自动覆盖为最新
- **周报集成**：与周报页面无缝整合

## 接口定义

### 请求参数

```json
{
  "action": "log",
  "parent_id": "string",
  "child_id": "string (可选)",
  "emotion_level": "number (1-5)",
  "week_start": "string (YYYY-MM-DD，可选，默认本周一)",
  "client_ip": "string (可选)"
}
```

### 响应格式

成功：
```json
{
  "success": true,
  "data": {
    "emotion_log_id": "string",
    "emotion_level": 1,
    "emotion_emoji": "😊",
    "week_start": "2026-03-30",
    "week_end": "2026-04-05"
  }
}
```

失败：
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE (可选)"
}
```

## 情绪等级定义

| 等级 | 表情 | 含义 |
|------|------|------|
| 1 | 😊 | 积极 |
| 2 | 😐 | 一般 |
| 3 | 😢 | 低落 |
| 4 | 😠 | 烦躁 |
| 5 | 😰 | 焦虑 |

## 部署说明

1. 在微信开发者工具中打开项目
2. 右键 `cloudfunctions/emotion-log` 目录
3. 选择"上传并部署：云端安装依赖"
4. 在云开发控制台测试函数

## 测试

```bash
cd cloudfunctions/emotion-log
node test/emotion-log.test.js
```

## 合规声明

本产品不构成医疗建议。数据仅用于家庭关怀。紧急情况请拨打120。
本云函数不涉及疾病诊断、心理评估、治疗方案推荐或医疗数据监测。
