# 云函数开发指南

## 📁 目录结构

```
cloudfunctions/
├── common/                    # 公共库
│   ├── db.js                  # 数据库操作
│   ├── notifier.js            # 消息推送
│   ├── logger.js              # 日志工具
│   ├── errors.js              # 错误处理
│   └── utils.js               # 通用工具
│
├── login/                     # 登录认证
├── medication/                # 用药提醒
├── report/                    # 周报生成
├── secure/                    # 诈骗识别
├── location/                  # 防走失定位
├── taxi/                      # 叫车帮手
├── scan/                      # 扫码帮手
│
└── package.json               # 全局依赖（可选）
```

---

## 🚀 快速开始

### 1. 本地开发

```bash
cd cloudfunctions/your-function
npm install
```

### 2. 上传部署

在微信开发者工具中：
- 右键云函数目录 → 「上传并部署：云端安装依赖」
- 或使用 CLI：`tcb functions:deploy`

### 3. 测试

在开发者工具 Console：
```javascript
wx.cloud.callFunction({
  name: 'medication',
  data: { type: 'test' },
  success: console.log,
  fail: console.error
})
```

---

## 📖 开发规范

详见上级文档：`docs/cloud-function-standards.md`

- 编码规范（命名、异步、错误处理）
- 日志规范（结构化日志）
- 数据库权限（最小权限原则）
- 安全规范（参数验证、防注入）

---

## 🔧 调试技巧

### 查看云函数日志

微信开发者工具 → 云开发控制台 → 日志

或使用 CLI：
```bash
tcb functions:log --name medication
```

### 本地调试

安装云函数模拟器：
```bash
npm install -g @cloudbase/functions-simulator
```

运行：
```bash
cd cloudfunctions/medication
npm run simulate
```

---

## ⚡ 性能优化

1. **减少数据库查询**：使用 `_id` 索引，批量查询
2. **缓存热点数据**：使用 `cloudbase.cache()` 或内存缓存
3. **异步处理**：非核心逻辑使用队列（如生成周报）
4. **连接复用**：数据库连接池（自动管理）

---

## 🐛 常见问题

### Q: 云函数超时（默认 20s）？

A：拆分长任务，使用异步回调或队列。

### Q: 数据库权限错误？

A：检查 `project.config.json` 中的权限配置，或使用 `cloudbase-database-<env-id>` 的权限。

### Q: 无法调用其他云函数？

A：确保已在 `project.config.json` 的 `functions` 中声明依赖，或使用 `cloudbase.callFunction()`。

---

**维护**：@aitogether  
**更新**：2026-04-16
