# 微信小程序开发指南 · Parents Weekly Briefing

**版本**：P0 内测版 v0.2  
**小程序框架**：微信原生小程序  
**最后更新**：2026-04-16

---

## 📋 目录

1. [环境准备](#环境准备)
2. [项目导入](#项目导入)
3. [项目结构](#项目结构)
4. [页面说明](#页面说明)
5. [API 配置](#api配置)
6. [本地开发](#本地开发)
7. [调试技巧](#调试技巧)
8. [常见问题](#常见问题)

---

## 环境准备

### 1. 安装微信开发者工具

- 下载地址：[微信开发者工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 系统要求：Windows 7+ / macOS 10.10+
- 安装后使用微信扫码登录

### 2. 注册小程序账号（可选）

- 内测阶段可使用"测试号"直接在开发者工具中预览
- 正式发布前需要在[微信公众平台](https://mp.weixin.qq.com/)注册小程序并获取 AppID

---

## 项目导入

1. 打开微信开发者工具
2. 选择「小程序」→「导入项目」
3. 项目目录选择：`wechat-miniprogram/`
4. AppID 选择：
   - **测试**：使用"测试号"（内测阶段推荐）
   - **正式**：填入你的小程序 AppID
5. 项目名称：父母周报
6. 点击「导入」即可

---

## 项目结构

```
wechat-miniprogram/
├── app.js              # 小程序入口逻辑
├── app.json            # 全局配置（页面路由、窗口样式、权限）
├── app.wxss            # 全局样式
├── privacy.json        # 隐私配置
├── project.config.json # 项目配置
├── sitemap.json        # 搜索配置
├── images/             # 图片资源
├── pages/              # 页面目录
│   ├── index/          # 启动页/引导页
│   ├── report/         # 子女端：周报页面
│   ├── parent/         # 父母端：服药确认页面
│   ├── child/          # 子女端：发送留言页面
│   └── privacy/        # 隐私政策页面
├── utils/              # 工具函数
│   ├── api.js          # 后端 API 封装
│   ├── auth.js         # 登录/认证逻辑
│   ├── format.js       # 数据格式化
│   └── storage.js      # 本地缓存封装
└── styles/             # 全局样式（可选）
```

---

## 页面说明

### 主要页面路由

所有页面均在 `app.json` 中注册，路由配置如下：

| 页面路径 | 对应文件 | 目标用户 | 功能 |
|---------|---------|---------|------|
| `pages/index` | `pages/index/*` | 首次使用者 | 引导页，选择身份（子女/父母） |
| `pages/report` | `pages/report/*` | 子女 | 查看父母的服药确认周报 |
| `pages/parent` | `pages/parent/*` | 父母 | 每日服药确认页面 |
| `pages/child` | `pages/child/*` | 子女 | 给父母发送语音留言（回声消息） |
| `pages/privacy` | `pages/privacy/*` | 所有人 | 隐私政策说明 |

### 页面间跳转逻辑

```
index (选择身份)
  ├─→ report (子女端主页)
  ├─→ child  (子女端留言页)
  └─→ parent (父母端服药页)
```

---

## API 配置

### 后端地址设置

1. 在微信开发者工具中，点击右上角「详情」
2. 在「本地设置」中找到：
   - **不校验合法域名**：✅ 勾选（开发阶段）
   - **不校验 TLS 版本**：✅ 勾选（如遇到 HTTPS 错误）
3. 在代码中配置 API 地址（推荐方式）：

编辑 `utils/api.js`，修改 `BASE_URL`：

```javascript
const BASE_URL = 'https://your-backend-api.com/v1'
// 本地开发示例：
// const BASE_URL = 'http://localhost:3000/v1'
```

### 请求域名白名单（正式环境）

正式发布前，需在微信公众平台配置「服务器域名」：

- `request` 合法域名：你的后端 API HTTPS 地址
- 如使用云函数，配置对应的云函数域名

---

## 本地开发

### 调试模式

- 打开微信开发者工具 → 点击「Console」标签查看日志
- 使用 `console.log()` 输出调试信息
- Network 面板查看 API 请求详情

### 修改代码后重载

- 保存文件后，开发者工具会自动重载
- 如需手动重载：点击工具栏「编译」按钮
- 清除缓存：工具栏 → 「清缓存」→ 「全部清除」

### 模拟器 vs 真机调试

**模拟器调试**（推荐开发阶段使用）：
- 速度快，可模拟不同机型
- 不支持摄像头、GPS、蓝牙等硬件功能

**真机调试**（功能测试必需）：
- 点击工具栏「预览」→ 使用微信扫码在真机上运行
- 可测试：摄像头、语音、震动、步数等硬件交互

---

## 调试技巧

### 1. 查看存储数据

小程序本地缓存可在「Storage」面板查看：

```javascript
// 查看登录 token
wx.getStorageSync('token')

// 查看用户信息
wx.getStorageSync('user')
```

### 2. 强制刷新登录态

如果遇到 401 错误，可在 Console 执行：

```javascript
wx.removeStorageSync('token')
// 然后重启小程序
```

### 3. 查看页面栈

```javascript
console.log(getCurrentPages())
// 返回当前页面栈数组，可用于调试路由
```

---

## 常见问题

### Q1: 编译失败，提示 "app.json 未找到"

**原因**：项目目录选择错误  
**解决**：确保选择的目录是 `wechat-miniprogram/`，而不是上层目录

---

### Q2: 真机预览时 API 请求失败

**原因**：域名未配置或 HTTPS 证书问题  
**解决**：
1. 确认后端服务已启动并可访问
2. 开发者工具中勾选「不校验合法域名」
3. 生产环境需配置 HTTPS 和合法域名

---

### Q3: 页面跳转后返回上一页时数据丢失

**原因**：页面 `onUnload` 时数据被清除  
**解决**：使用全局状态管理或本地缓存保存关键数据

---

### Q4: 登录后仍提示未登录

**原因**：token 过期或未正确存储  
**解决**：检查 `utils/auth.js` 中的 token 存储逻辑，确认后端返回的 token 格式正确

---

### Q5: 云函数调用失败

**原因**：小程序云开发环境未配置  
**解决**：本项目暂未使用云函数，所有 API 由独立后端服务提供

---

## 下一步

- 阅读 [后端开发指南](../backend/README.md) 了解 API 接口详情
- 查看 [产品需求文档](../docs/prd/) 理解功能设计
- 参考 [内测手册](../docs/pilot-manual.md) 了解用户使用流程

---

## 贡献

欢迎提交 Pull Request！请先阅读 [CONTRIBUTING.md](../CONTRIBUTING.md)。

