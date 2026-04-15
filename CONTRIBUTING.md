# 🤝 贡献指南

欢迎为「父母周报」项目做出贡献！本项目为独立开发者维护的小型开源项目，所有贡献均基于志愿者精神。

---

## 📋 行为准则

我们遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 的核心理念：
- 使用友善、尊重的语言
- 接受建设性批评
- 专注于项目最佳利益
- 对不同背景的贡献者保持开放态度

如有违反，项目维护者有权删除不当评论、封禁用户。

---

## 🔄 工作流程（一人公司模式）

由于项目采用 **一人公司** 模式开发，当前贡献流程较为简单：

### 对于代码贡献（Pull Request）
1. **Fork 仓库** → 在您的 GitHub 账号下创建副本
2. **创建分支** → 从 `main` 分支切出新分支（命名建议：`fix/xxx` 或 `feat/xxx`）
3. **本地开发** → 在分支上进行修改，确保通过所有测试
4. **提交 PR** → 向 `aitogether:main` 提交 Pull Request
5. **等待审核** → 维护者会在 3-5 个工作日内审核（可能直接合并或要求修改）

### 对于文档/翻译贡献
- 直接在 GitHub Web 界面编辑 Markdown 文件（无需 PR）
- 或提交 PR，流程同上

### 对于问题反馈（Issue）
- **Bug 报告**：请使用 `bug-report.md` 模板，提供复现步骤、环境信息
- **功能请求**：请使用 `feature-request.md` 模板，说明需求场景和优先级
- **一般咨询**：请使用 `question.md` 模板，或在 Discussions 区提问

---

## 🧪 本地开发环境

### 后端服务（Node.js + Express）

```bash
# 克隆仓库
git clone https://github.com/aitogether/parents-weekly-briefing.git
cd parents-weekly-briefing/backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入：
# - 数据库路径（默认使用 JSON 文件存储）
# - 微信云开发密钥（可选，用于云函数调用）
# - JWT 密钥（自动生成即可）

# 启动开发服务器
npm run dev  # 监听端口 3000

# 运行测试
npm test
```

**目录结构**：
```
backend/
├── src/
│   ├── routes/       # API 路由（medication.js, report.js, echo.js）
│   ├── controllers/  # 控制器逻辑
│   ├── store.js      # 数据存储（JSON 文件）
│   └── app.js        # Express 应用入口
├── test/
│   └── *.test.js     # 单元测试
├── .env.example      # 环境变量模板
└── package.json
```

### 微信小程序

1. **安装工具**：下载[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. **打开项目**：选择 `wechat-miniprogram/` 目录
3. **配置后端**：在 `app.js` 中修改 `API_BASE_URL` 为本地地址（如 `http://localhost:3000`）
4. **编译预览**：点击工具栏「编译」按钮

**目录结构**：
```
wechat-miniprogram/
├── pages/
│   ├── child/          # 子女端页面（周报、用药管理）
│   ├── parent/         # 父母端页面（用药确认）
│   └── index/          # 登录/绑定页面
├── utils/
│   ├── api.js          # API 请求封装
│   ├── auth.js         # 认证逻辑
│   └── util.js         # 通用工具函数
├── app.js              # 小程序入口
├── app.json            # 全局配置
└── app.wxss            # 全局样式
```

---

## 🧪 测试规范

### 运行测试

```bash
cd backend
npm test           # 所有测试
npm run test:unit  # 单元测试
npm run test:api   # API 测试（需要启动后端服务）
```

### 编写测试

新功能必须附带测试用例，覆盖率要求 ≥ 70%。测试文件命名：`<模块名>.test.js`，放在 `backend/test/` 目录。

示例（ medication 路由测试）：
```javascript
const request = require('supertest')
const app = require('../src/app')

describe('POST /api/medication/confirm', () => {
  it('应返回 200 和确认结果', async () => {
    const res = await request(app)
      .post('/api/medication/confirm')
      .send({ parentId: 'test-parent', date: '2026-04-15', confirmed: true })
    expect(res.statusCode).toBe(200)
  })
})
```

---

## 📝 代码风格

- **JavaScript**：遵循 [StandardJS](https://standardjs.com/) 规范（无分号、2 空格缩进）
- **Markdown**：标题层级清晰，代码块标注语言，中英文间加空格
- **提交信息**：使用约定式提交（Conventional Commits）：
  ```
  feat: 新增用药提醒功能
  fix: 修复周报数据延迟问题
  docs: 更新 README
  style: 代码格式化
  refactor: 重构数据库访问层
  test: 增加单元测试
  chore: 更新依赖
  ```

---

## 🔍 Issue 模板

仓库已配置以下 Issue 模板（位于 `.github/ISSUE_TEMPLATE/`）：

- `bug-report.md`：功能异常、崩溃、数据错误
- `feature-request.md`：新功能建议
- `question.md`：使用咨询

提交 Issue 时，请**选择对应模板**并填写完整信息，否则可能被关闭。

---

## 📦 发布流程

当前项目处于 **P0 内测阶段**，无正式版本号。发布流程如下：

1. **开发完成** → 本地测试通过
2. **提交 PR** → 合并到 `main` 分支
3. **GitHub Actions** → 自动运行测试 + 部署云函数
4. **手动标记** → 在 README 中更新版本号（如 v0.2）

正式版发布（P1 及以上）将采用 [Semantic Versioning](https://semver.org/) 版本号。

---

## 🎯 优先级指南

如果您想贡献但不确定从何下手，请参考优先级：

**P0（当前内测阶段，最高优先级）**：
- 修复阻塞内测的 Bug
- 完善内测文档（pilot-manual、FAQ）
- 提升父母端可访问性（字体大小、按钮尺寸）

**P1（下一阶段）**：
- 多父母绑定支持
- 历史周报回看
- 手动步数录入

**P2（未来功能）**：
- 语音消息
- 健康指标扩展（血压、血糖手动录入）
- 家庭群聊功能

---

## 🙏 致谢

感谢每一位贡献者！无论您是提交代码、报告 Bug，还是提出改进建议，都对本项目至关重要。

本项目遵守 [CC BY-NC 4.0](LICENSE) 许可证，非商业用途可自由使用。

---

**最后更新**：2026-04-16  
**维护者**：[aitogether](https://github.com/aitogether)
