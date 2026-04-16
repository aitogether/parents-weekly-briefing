# 云开发环境配置指南（父母周报）

## 1. 开通云开发

1. 打开微信开发者工具，导入项目 `wechat-miniprogram/`
2. 点击顶部菜单「工具」→「云开发」
3. 首次使用点击「开通云开发」
4. 创建环境：
   - **环境名称**：`prod`（或 `parents-weekly-briefing-prod`）
   - **环境 ID**：自动生成（建议记录，代码中需要）
   - **计费方式**：按量计费（免费额度足够内测使用）
5. 等待环境初始化完成（约 2 分钟）

## 2. 上传云函数

在开发者工具左侧文件树中，依次右键每个 `cloudfunctions/*` 目录：

```
右键 cloudfunctions/login → 上传并部署：云端安装依赖
右键 cloudfunctions/invite → 上传并部署：云端安装依赖
右键 cloudfunctions/medication → 上传并部署：云端安装依赖
右键 cloudfunctions/report → 上传并部署：云端安装依赖
右键 cloudfunctions/feedback → 上传并部署：云端安装依赖
右键 cloudfunctions/werun → 上传并部署：云端安装依赖
```

等待每个函数部署完成（控制台显示「上传成功」）。

## 3. 初始化云数据库

1. 在云开发控制台 →「数据库」标签页
2. 创建以下集合（Collection）：

| 集合名 | 用途 | 权限建议（测试期） |
|--------|------|-------------------|
| `users` | 用户基本信息 | 所有用户可读写 |
| `parents` | 父母档案 | 所有用户可读写 |
| `medication_plans` | 用药计划 | 所有用户可读写 |
| `medication_records` | 用药确认记录 | 所有用户可读写 |
| `reports` | 周报记录 | 所有用户可读写 |
| `feedback` | 用户反馈 | 所有用户可读写 |

3. 每个集合创建时，先设置为「所有用户可读写」便于测试；上架前改为「仅创建者可读写」

## 4. 获取环境配置

部署完成后，在云开发控制台 →「设置」→「环境配置」中获取：
- **环境 ID**（如 `parents-weekly-briefing-prod-xxxxx`）
- **云函数 URL**（自动生成，格式如 `https://tcb-api.tencentcloudapi.com`）

将此环境 ID 告知后端开发人员，用于配置 OpenClaw 调度任务。

## 5. 测试云函数

在开发者工具 Console 中执行：

```javascript
// 测试 login 云函数
wx.cloud.callFunction({
  name: 'login',
  data: { action: 'profile' },
  success: res => console.log('登录测试成功', res),
  fail: err => console.error('失败', err)
})
```

如能正常返回用户信息，说明云开发配置完成。

---

**遇到问题？** 查看 [微信云开发官方文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html) 或提交 [GitHub Issue](../../issues)。
