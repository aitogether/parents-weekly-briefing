# 父母周报小程序 - UI适老化改造任务清单
**版本**: v1.0  
**日期**: 2026-04-19  
**来源**: 三个subagent深度讨论(可用性+心理情感+合规安全)  
**目标**: 工部分步实施  
**总任务数**: 18个 | **预计总工时**: 5-7天  

---

## 📋 任务总览

| 优先级 | 任务数 | 预计工时 | 核心目标 |
|--------|--------|----------|----------|
| **P0-紧急** | 8 | 1.5天 | 合规整改+基础可用性 |
| **P1-高优先级** | 4 | 2天 | 交互反馈+情感化 |
| **P2-中期优化** | 4 | 2.5天 | 视觉层级+色彩体系 |
| **P3-持续优化** | 2 | 1天 | 无障碍+长期迭代 |
| **合计** | 18 | 5-7天 | 全面适老化 |

---

## 🚨 P0-紧急任务 (本周完成)

### 任务 UI-FONT-01: 全局字体大小提升至适老标准

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-FONT-01 |
| **模块** | 可用性 - 基础可读性 |
| **优先级** | P0 🔴 |
| **任务名** | 全局字体大小提升至适老标准 |
| **具体内容** | 将所有页面正文文字从当前28rpx提升至≥32rpx，辅助说明文字≥28rpx，极次要信息≥24rpx |
| **涉及文件** | miniprogram/pages/report/report.wxss<br>miniprogram/pages/checklist/checklist.wxss<br>miniprogram/styles/app.wxss (新增全局样式) |
| **代码变更** | ```wxss
/* report/report.wxss */
.fact-label { font-size: 32rpx; }
.fact-note { font-size: 28rpx; }
.wonder-item { font-size: 30rpx; }
.disclaimer-footer { font-size: 26rpx; }

/* checklist/checklist.wxss */
.item-name { font-size: 32rpx; }
.item-desc { font-size: 28rpx; }

/* styles/app.wxss - 全局基准 */
page { font-size: 32rpx; line-height: 1.8; }
``` |
| **验收标准** | 1. 在 iPhone 12 (390×844) 和 安卓 1080p 设备上，正文无需缩放即可清晰阅读<br>2. 70岁老人测试反馈: 文字清晰不费眼<br>3. 布局无错乱，文字未超出容器 |
| **预计工时** | 4小时 |
| **依赖项** | 无 |
| **风险提示** | 字体增大可能导致部分卡片高度变化，需同步调整 padding/margin |

---

### 任务 UI-ICON-01: 为数据展示添加图标视觉辅助

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-ICON-01 |
| **模块** | 可用性 - 视觉辅助 |
| **优先级** | P0 🔴 |
| **任务名** | 为数据展示添加图标视觉辅助 |
| **具体内容** | 在 report 页面的用药、步数、心率等数据行前添加对应 emoji 图标，降低认知负荷 |
| **涉及文件** | miniprogram/pages/report/report.wxml<br>miniprogram/pages/report/report.wxss |
| **代码变更** | ```wxss
/* report.wxss 新增 */
.fact-row { position: relative; padding-left: 60rpx; }
.fact-icon { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 48rpx; height: 48rpx; font-size: 32rpx; display: flex; align-items: center; justify-content: center; background: #F0FAF6; border-radius: 12rpx; }
```<br><br>```xml
<!-- report.wxml 修改示例 -->
<view class="fact-row">
  <view class="fact-icon">💊</view>
  <text class="fact-label">用药完成</text>
  <text class="fact-value">{{medRate}}%</text>
</view>
<view class="fact-row">
  <view class="fact-icon">🚶</view>
  <text class="fact-label">日均步数</text>
  <text class="fact-value">{{dailySteps}} 步</text>
</view>
``` |
| **验收标准** | 1. 每个数据行都有明确的 emoji 图标<br>2. 图标尺寸≥48rpx，清晰可辨<br>3. 老人测试: 能快速说出每个图标代表什么 |
| **预计工时** | 3小时 |
| **依赖项** | 无 |
| **风险提示** | emoji 在不同设备显示可能略有差异，建议测试低端机兼容性 |

---

### 任务 UI-PROGRESS-01: 实现用药完成率可视化进度条

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-PROGRESS-01 |
| **模块** | 可用性 - 数据可视化 |
| **优先级** | P0 🔴 |
| **任务名** | 实现用药完成率可视化进度条 |
| **具体内容** | 将用药完成率从纯数字改为线性进度条展示，配合渐变色动画 |
| **涉及文件** | miniprogram/pages/report/report.wxml<br>miniprogram/pages/report/report.wxss<br>miniprogram/pages/report/report.js (可能需要调整数据绑定) |
| **代码变更** | ```wxss
/* report.wxss 新增 */
.med-progress-bar { height: 16rpx; background: #E8F5E9; border-radius: 8rpx; overflow: hidden; margin-top: 8rpx; }
.med-progress-fill { height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); border-radius: 8rpx; transition: width 0.3s ease; }
```<br><br>```xml
<!-- report.wxml 在用药完成率后插入 -->
<view class="med-progress-bar">
  <view class="med-progress-fill" style="width: {{medRate}}%"></view>
</view>
``` |
| **验收标准** | 1. 进度条高度≥16rpx，颜色渐变自然<br>2. 数据变化时有 0.3s 平滑动画<br>3. 色弱用户可通过进度长度准确判断完成率 |
| **预计工时** | 5小时 |
| **依赖项** | 无 |
| **风险提示** | 需要确保后端返回的 medRate 为 0-100 的数值 |

---

### 任务 COMPLIANCE-01: 删除report页"心率异常"等诊断性词汇

| 字段 | 内容 |
|------|------|
| **任务ID** | COMPLIANCE-01 |
| **模块** | 合规 - 医疗红线 |
| **优先级** | P0 🔴 |
| **任务名** | 删除report页"心率异常"等诊断性词汇 |
| **具体内容** | 将"心率异常"改为"心脏关注提醒"(中性表述)，删除所有异常/评分等暗示诊断的词汇 |
| **涉及文件** | miniprogram/pages/report/report.wxml<br>miniprogram/pages/report/report.js (数据字段名可保留，仅改展示文案) |
| **代码变更** | ```xml
<!-- 修改前 -->
<text>心率异常: {{anomalies}} 次</text>

<!-- 修改后 -->
<text>心脏关注提醒: {{anomalies}} 次</text>
<!-- 或更中性: -->
<text>心率记录: {{anomalies}} 次需关注</text>
``` |
| **验收标准** | 1. 页面不再出现"异常""诊断""风险"等医疗术语<br>2. 所有表述均为"数据记录"或"关注提醒"等中性描述<br>3. 通过合规团队审核 |
| **预计工时** | 2小时 |
| **依赖项** | 无 |
| **风险提示** | 后端数据字段名可保留，仅修改前端展示，避免后端大规模改动 |

---

### 任务 COMPLIANCE-02: 修改checklist页标题为中性关怀表述

| 字段 | 内容 |
|------|------|
| **任务ID** | COMPLIANCE-02 |
| **模块** | 合规 - 医疗暗示 |
| **优先级** | P0 🔴 |
| **任务名** | 修改checklist页标题为中性关怀表述 |
| **具体内容** | 将"安全检查每周一次，守护安全"改为"我们一起关心您的生活状态👨‍👩‍👧‍👦" |
| **涉及文件** | miniprogram/pages/checklist/checklist.wxml |
| **代码变更** | ```xml
<!-- 修改前 -->
<view class="page-title">安全检查每周一次，守护安全</view>

<!-- 修改后(方案1) -->
<view class="page-title">我们一起关心您的生活状态 👨‍👩‍👧‍👦</view>

<!-- 修改后(方案2) -->
<view class="page-title">这周的平安小贴士 ✨</view>
``` |
| **验收标准** | 1. 标题不再出现"检查""守护"等执法/安保词汇<br>2. 通过合规团队审核<br>3. 老人测试: 觉得这是"关心"而非"检查" |
| **预计工时** | 1小时 |
| **依赖项** | 无 |
| **风险提示** | 需同步修改 checklist.js 中的页面标题设置(如有) |

---

### 任务 COMPLIANCE-03: 添加免责声明横幅(短版)

| 字段 | 内容 |
|------|------|
| **任务ID** | COMPLIANCE-03 |
| **模块** | 合规 - 免责声明 |
| **优先级** | P0 🔴 |
| **任务名** | 添加免责声明横幅(短版) |
| **具体内容** | 在所有页面底部添加固定免责声明横幅，展示3条核心声明 |
| **涉及文件** | miniprogram/pages/report/report.wxml<br>miniprogram/pages/checklist/checklist.wxml<br>miniprogram/pages/med-confirm/med-confirm.wxml<br>miniprogram/styles/disclaimer.wxss (新增) |
| **代码变更** | ```wxss
/* disclaimer.wxss 新增 */
.disclaimer-banner { position: fixed; bottom: 0; left: 0; right: 0; background: #FFF8E1; border-top: 2rpx solid #FFE082; padding: 16rpx 24rpx; font-size: 22rpx; color: #666; text-align: center; line-height: 1.6; z-index: 100; }
.disclaimer-banner::before { content: '⚠️'; margin-right: 8rpx; }
```<br><br>```xml
<!-- 各页面底部添加 -->
<view class="disclaimer-banner">
  本产品不构成医疗建议 · 数据仅用于家庭关怀 · 紧急情况请拨打120
</view>

<!-- 需调整页面底部padding避免遮挡 -->
<view class="page-content" style="padding-bottom: 120rpx">
  ...
</view>
``` |
| **验收标准** | 1. 所有页面底部均有免责横幅<br>2. 文字清晰可读(对比度达标)<br>3. 不遮挡核心功能按钮<br>4. 通过法务审核 |
| **预计工时** | 3小时 |
| **依赖项** | 需法务提供最终免责声明文案 |
| **风险提示** | 横幅可能遮挡部分页面内容，需测试所有机型安全区域 |

---

### 任务 EMOTION-01: 修改用药确认按钮文案(正向表达)

| 字段 | 内容 |
|------|------|
| **任务ID** | EMOTION-01 |
| **模块** | 情感 - 文案优化 |
| **优先级** | P0 🔴 |
| **任务名** | 修改用药确认按钮文案(正向表达) |
| **具体内容** | 将"已吃/没吃"二元对立改为"按时服药了✅"和"明天记得⏰"，消除责备感 |
| **涉及文件** | miniprogram/pages/med-confirm/med-confirm.wxml<br>miniprogram/pages/med-confirm/med-confirm.wxss |
| **代码变更** | ```xml
<!-- 修改前 -->
<button class="med-btn">已吃</button>
<button class="med-btn">没吃</button>

<!-- 修改后(方案1) -->
<button class="med-btn taken">✅ 按时服药了</button>
<button class="med-btn postpone">⏰ 明天记得</button>

<!-- 修改后(方案2) -->
<button class="med-btn taken">💊 已经吃过了</button>
<button class="med-btn skip">📅 稍后提醒我</button>
``` |
| **验收标准** | 1. 按钮文字积极正向，无负面暗示<br>2. 老人测试: 点击"明天记得"无心理负担<br>3. 通过子女用户访谈确认语气得体 |
| **预计工时** | 2小时 |
| **依赖项** | 无 |
| **风险提示** | 需同步修改 med-confirm.js 中的状态判断逻辑(如果依赖按钮文字) |

---

### 任务 EMOTION-02: 修改导航栏标题(去除汇报感)

| 字段 | 内容 |
|------|------|
| **任务ID** | EMOTION-02 |
| **模块** | 情感 - 品牌温度 |
| **优先级** | P0 🔴 |
| **任务名** | 修改导航栏标题(去除汇报感) |
| **具体内容** | 将"父母周报"改为"温馨家园🌿"或"爸妈的健康小记💝"，营造家庭对话氛围 |
| **涉及文件** | miniprogram/app.json |
| **代码变更** | ```json
{
  "window": {
    "navigationBarTitleText": "温馨家园🌿"
  }
}
``` |
| **验收标准** | 1. 标题温暖亲切，无"汇报""周报"等机构感词汇<br>2. emoji 显示正常(Android/iOS均兼容)<br>3. 用户调研: 老人觉得这是"自家人的东西" |
| **预计工时** | 0.5小时 |
| **依赖项** | 无 |
| **风险提示** | 需确认微信小程序导航栏 emoji 显示兼容性(如不兼容则改用文字🌱) |

---

## 🔶 P1-高优先级任务 (下周完成)

### 任务 UI-CONTRAST-01: 增强全局文字对比度

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-CONTRAST-01 |
| **模块** | 可用性 - 无障碍 |
| **优先级** | P1 🟡 |
| **任务名** | 增强全局文字对比度 |
| **具体内容** | 将次要文字颜色从 #666/#999 加深，卡片增加边框明确边界，确保 WCAG AA 标准(≥4.5:1) |
| **涉及文件** | miniprogram/styles/colors.wxss<br>miniprogram/pages/*/*.wxss |
| **代码变更** | ```wxss
/* colors.wxss 修改 */
--text-main: #222222;  /* 原 #374151 */
--text-sub: #444444;   /* 原 #6B7280 */
--text-tertiary: #666666; /* 新增三级文字 */

/* 全局卡片增强 */
.card { border: 2rpx solid #E0E0E0; box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06); }
``` |
| **验收标准** | 1. 主要文字对比度 ≥ 15:1<br>2. 次要文字对比度 ≥ 8:1<br>3. 辅助文字对比度 ≥ 4.5:1<br>4. 使用 WebAIM Contrast Checker 验证通过 |
| **预计工时** | 6小时 |
| **依赖项** | 无 |
| **风险提示** | 颜色加深可能影响整体风格，需保持品牌色协调 |

---

### 任务 UI-FEEDBACK-01: 为所有点击操作增加震动和动画反馈

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-FEEDBACK-01 |
| **模块** | 可用性 - 交互反馈 |
| **优先级** | P1 🟡 |
| **任务名** | 为所有点击操作增加震动和动画反馈 |
| **具体内容** | 在每个按钮的 bindtap 事件中添加 wx.vibrateShort，CSS 添加 :active 缩放效果 |
| **涉及文件** | 所有页面的 .js 和 .wxss 文件 |
| **代码变更** | ```javascript
// 每个页面的 onLoad 中添加震动初始化
data: { needVibrate: true }

// 每个 bindtap 函数开头添加
onButtonTap(e) {
  if (this.data.needVibrate) {
    wx.vibrateShort({ type: 'light' });
  }
  // 原有逻辑...
}
```<br><br>```wxss
/* 所有按钮添加 */
button { transition: transform 0.1s ease; }
button:active { transform: scale(0.98); }
``` |
| **验收标准** | 1. 每次点击按钮都有轻微震动(设备支持时)<br>2. 按钮有 0.1s 缩放动画<br>3. 加载状态显示 loading 动画 |
| **预计工时** | 8小时 (遍历所有页面) |
| **依赖项** | 无 |
| **风险提示** | 需考虑用户手机震动权限设置，提供"关闭震动"选项(可选) |

---

### 任务 COMPLIANCE-04: 设计并实现隐私授权弹窗流程

| 字段 | 内容 |
|------|------|
| **任务ID** | COMPLIANCE-04 |
| **模块** | 合规 - 隐私保护 |
| **优先级** | P1 🟡 |
| **任务名** | 设计并实现隐私授权弹窗流程 |
| **具体内容** | 首次使用显示隐私政策说明弹窗，用户勾选同意后才能继续使用 |
| **涉及文件** | miniprogram/app.js (新增逻辑)<br>miniprogram/pages/privacy/privacy.* (新增弹窗组件)<br>miniprogram/utils/storage.js (新增同意状态存储) |
| **代码变更** | ```javascript
// app.js onLaunch
onLaunch() {
  const agreed = wx.getStorageSync('privacyAgreed');
  if (!agreed) {
    this.globalData.showPrivacy = true;
  }
}

// privacy.js
Page({
  onAgree() {
    wx.setStorageSync('privacyAgreed', true);
    wx.navigateBack();
  }
})
``` |
| **验收标准** | 1. 新用户首次进入必须阅读隐私政策<br>2. 用户勾选"同意"后才能使用核心功能<br>3. 同意状态持久化存储 |
| **预计工时** | 1天 |
| **依赖项** | 需法务提供隐私政策最终文案 |
| **风险提示** | 微信小程序对隐私合规要求严格，需确保弹窗在 app.js 早期触发 |

---

### 任务 EMOTION-03: 修改完成进度文案(去除KPI感)

| 字段 | 内容 |
|------|------|
| **任务ID** | EMOTION-03 |
| **模块** | 情感 - 文案优化 |
| **优先级** | P1 🟡 |
| **任务名** | 修改完成进度文案(去除KPI感) |
| **具体内容** | 将"本周已完成 {{safetyCompleted}}/8 项"改为"这周我们一起关注了 {{safetyCompleted}} 件小事💕" |
| **涉及文件** | miniprogram/pages/report/report.wxml<br>miniprogram/pages/report/report.js |
| **代码变更** | ```xml
<!-- 修改前 -->
<text>本周已完成 {{safetyCompleted}}/8 项</text>

<!-- 修改后 -->
<text>这周我们一起关注了 {{safetyCompleted}} 件小事 💕</text>
``` |
| **验收标准** | 1. 文案温暖，无考核压力感<br>2. 去掉分母量化(仅展示绝对值)<br>3. 老人反馈: 感觉像"分享"而非"汇报" |
| **预计工时** | 1小时 |
| **依赖项** | 无 |
| **风险提示** | 需同步调整 report.js 中的文案拼接逻辑(如有) |

---

## 🟢 P2-中期优化任务 (2-4周)

### 任务 UI-LAYOUT-01: 重构med-confirm页面布局突出核心任务

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-LAYOUT-01 |
| **模块** | 可用性 - 信息层级 |
| **优先级** | P2 🟢 |
| **任务名** | 重构med-confirm页面布局突出核心任务 |
| **具体内容** | 将"今日用药确认"设计为核心任务卡片(高亮背景+阴影)，药品列表弱化为次要区域 |
| **涉及文件** | miniprogram/pages/med-confirm/med-confirm.wxml<br>miniprogram/pages/med-confirm/med-confirm.wxss |
| **代码变更** | ```wxss
/* 核心任务卡片突出 */
.core-task-card { background: #fff; border-radius: 24rpx; padding: 40rpx 32rpx; margin: 32rpx 24rpx; box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1); border: 4rpx solid #4CAF50; }
.task-title { font-size: 40rpx; font-weight: 800; color: #1B5E20; }

/* 药品列表弱化 */
.med-list-section { background: #FAFAFA; border-radius: 16rpx; padding: 24rpx; margin: 0 24rpx; border-left: 6rpx solid #4CAF50; }
``` |
| **验收标准** | 1. 核心任务区域视觉权重最高<br>2. 次要信息清晰区分但不丢失<br>3. 老人首次进入能快速定位"今天吃了吗"按钮 |
| **预计工时** | 1天 |
| **依赖项** | 无 |
| **风险提示** | 布局重构需测试所有机型适配，避免内容溢出 |

---

### 任务 UI-COLOR-01: 优化全局色板为老年友好方案

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-COLOR-01 |
| **模块** | 可用性 - 色彩无障碍 |
| **优先级** | P2 🟢 |
| **任务名** | 优化全局色板为老年友好方案 |
| **具体内容** | 调整主色为深绿(#2E7D32)、警告色为深橙(#F57F17)、危险色为深红(#C62828)，避免蓝紫色系 |
| **涉及文件** | miniprogram/styles/colors.wxss |
| **代码变更** | ```wxss
/* 老年友好色板 */
--brand-teal: #2E7D32;        /* 深绿(主色) */
--brand-teal-dark: #1B5E20;   /* 深绿-按下 */
--brand-teal-light: #E8F5E9;  /* 浅绿背景 */
--brand-warning: #F57F17;     /* 深橙(警告) */
--brand-warning-light: #FFF3E0;
--brand-danger: #C62828;      /* 深红(危险) */
--brand-danger-light: #FFEBEE;
--heart-red: #C62828;         /* 统一深红 */
``` |
| **验收标准** | 1. 主要按钮使用深绿色，色弱用户可辨识<br>2. 警告状态使用橙色(非黄色)<br>3. 危险操作使用深红色<br>4. 通过 Color Oracle 等工具验证 |
| **预计工时** | 6小时 |
| **依赖项** | 需同步更新所有引用颜色的 WXSS 文件 |
| **风险提示** | 品牌色变更可能影响整体风格一致性，需评估品牌影响 |

---

### 任务 EMOTION-04: 优化一键确认按钮文案

| 字段 | 内容 |
|------|------|
| **任务ID** | EMOTION-04 |
| **模块** | 情感 - 文案优化 |
| **优先级** | P2 🟢 |
| **任务名** | 优化一键确认按钮文案 |
| **具体内容** | 将"一键确认"改为"好的，我已知晓💝"或"谢谢关心，收到啦✨" |
| **涉及文件** | miniprogram/pages/report/report.wxml |
| **代码变更** | ```xml
<!-- 修改前 -->
<button>一键确认</button>

<!-- 修改后 -->
<button>好的，我已知晓 💝</button>
``` |
| **验收标准** | 按钮语气亲切自然，有"回应家人"的感觉 |
| **预计工时** | 0.5小时 |
| **依赖项** | 无 |
| **风险提示** | 按钮文字变长需测试布局，确保不换行或溢出 |

---

### 任务 EMOTION-05: 增加操作成功正向激励文案

| 字段 | 内容 |
|------|------|
| **任务ID** | EMOTION-05 |
| **模块** | 情感 - 正向反馈 |
| **优先级** | P2 🟢 |
| **任务名** | 增加操作成功正向激励文案 |
| **具体内容** | 在操作成功后显示鼓励性 Toast(如"您真棒！继续保持🎉")，替代冰冷的"已保存" |
| **涉及文件** | miniprogram/pages/checklist/checklist.js<br>miniprogram/pages/med-confirm/med-confirm.js<br>miniprogram/pages/report/report.js |
| **代码变更** | ```javascript
// 修改 wx.showToast 调用
wx.showToast({
  title: '✅ 您真棒！继续保持',
  icon: 'none',
  duration: 2000
});

// 或更丰富的弹窗
wx.showModal({
  title: '🎉',
  content: '您已完成本周检查，真棒！',
  showCancel: false
});
``` |
| **验收标准** | 1. 每次成功操作都有正向情感反馈<br>2. 文案温暖积极，无冰冷感<br>3. 老人测试: 看到鼓励会心一笑 |
| **预计工时** | 4小时 (遍历所有成功回调) |
| **依赖项** | 无 |
| **风险提示** | 避免过度激励，每个操作都鼓励可能降低含金量，建议仅关键操作使用 |

---

## 🔵 P3-持续优化任务 (长期迭代)

### 任务 UI-ACCESS-01: 增加字体大小设置功能

| 字段 | 内容 |
|------|------|
| **任务ID** | UI-ACCESS-01 |
| **模块** | 可用性 - 无障碍 |
| **优先级** | P3 🔵 |
| **任务名** | 增加字体大小设置功能(大/超大/特大) |
| **具体内容** | 在设置页添加字体大小切换选项，通过 CSS 变量实时生效 |
| **涉及文件** | miniprogram/pages/settings/settings.* (新增)<br>miniprogram/styles/variables.wxss (新增变量)<br>miniprogram/app.js (读取设置) |
| **代码变更** | ```wxss
/* 字体大小变量 */
--font-size-base: 32rpx;  /* 默认 */
--font-size-large: 36rpx;  /* 大 */
--font-size-xlarge: 40rpx; /* 超大 */

page { font-size: var(--font-size-base); }
```<br><br>```javascript
// settings.js
Page({
  data: { fontSize: 'base' },
  onFontSizeChange(e) {
    const size = e.currentTarget.dataset.size;
    wx.setStorageSync('fontSize', size);
    const app = getApp();
    app.updateFontSize(size);
  }
})
``` |
| **验收标准** | 1. 三种字体大小可切换，实时生效<br>2. 布局在三种字号下均不崩坏<br>3. 老人可自行在设置中调整 |
| **预计工时** | 2天 |
| **依赖项** | 需先完成全局字体变量化改造 |
| **风险提示** | 字体放大可能导致部分固定高度元素溢出，需全面测试 |

---

### 任务 EMOTION-06: 优化checklist页面引导语

| 字段 | 内容 |
|------|------|
| **任务ID** | EMOTION-06 |
| **模块** | 情感 - 文案优化 |
| **优先级** | P3 🔵 |
| **任务名** | 优化checklist页面引导语 |
| **具体内容** | 将"请完成以下安全检查项"改为"这周我们来一起关心这些小事吧👨‍👩‍👧" |
| **涉及文件** | miniprogram/pages/checklist/checklist.wxml |
| **代码变更** | ```xml
<!-- 修改前 -->
<view class="guide-text">请完成以下安全检查项</view>

<!-- 修改后 -->
<view class="guide-text">这周我们来一起关心这些小事吧 👨‍👩‍👧</view>
``` |
| **验收标准** | 引导语亲切自然，无任务压力感 |
| **预计工时** | 1小时 |
| **依赖项** | 无 |
| **风险提示** | 此任务依赖于 COMPLIANCE-02 的整体文案风格统一 |

---

## 📊 实施路线图

### 第1周 (P0任务冲刺)
- **周一**: UI-FONT-01 (字体) + UI-ICON-01 (图标) → 可用性基础改造
- **周二**: UI-PROGRESS-01 (进度条) + COMPLIANCE-01-03 (合规 triad)
- **周三**: EMOTION-01-02 (情感文案) + 自测修复
- **周四**: 内部评审 + 老人用户小范围测试(1-2个家庭)
- **周五**: 根据反馈微调 + 提交 P1 任务排期

### 第2-3周 (P1任务并行)
- 并行执行: UI-CONTRAST-01 (对比度) + UI-FEEDBACK-01 (反馈) + COMPLIANCE-04 (隐私弹窗)
- 穿插进行: EMOTION-03 (进度文案) + 老人测试反馈收集

### 第4-5周 (P2任务迭代)
- 并行执行: UI-LAYOUT-01 (布局重构) + UI-COLOR-01 (色彩体系)
- 穿插进行: EMOTION-04-05 (激励文案) + A/B 测试不同文案版本

### 第6周+ (P3任务持续)
- 开发: UI-ACCESS-01 (字体设置)
- 优化: EMOTION-06 (引导语)
- 建立: 定期审查机制 + 用户反馈闭环

---

## ✅ 质量检查清单

- [ ] 代码已提交到 feature 分支
- [ ] 通过微信开发者工具编译(无错误)
- [ ] 在 iPhone 12 和 安卓低端机各测试 1 次
- [ ] 70+ 岁老人实际使用测试(至少 1 人)
- [ ] 截图对比: 修改前后
- [ ] 更新 CHANGELOG.md
- [ ] 提交 PR 并 @ 项目负责人 review
- [ ] 合并到 main 前通过 GitHub Actions 自动化检查

---

## 📁 产出物清单

- [x] **任务清单本文档** (UI-适老化改造任务清单.md)
- [ ] 可用性专家完整报告 (待 session_search 提取)
- [ ] 心理情感专家文案对照表 (待 session_search 提取)
- [ ] 合规安全专家风险分析 (已保存 /Users/diygun/parents-weekly-briefing-compliance-solution.md)
- [ ] 修改前后截图对比集 (实施过程中收集)
- [ ] 老人用户测试反馈记录 (测试阶段产出)

---

## 🎯 成功度量指标

| 维度 | 指标 | 目标值 |
|------|------|--------|
| **可用性** | 首次使用完成时间 | ≤2分钟 |
| | 核心操作成功率 | ≥95% |
| | 字体可读性评分(1-5分) | ≥4.5 |
| **情感化** | 老人正向反馈率 | ≥80% |
| | 子女推荐意愿(NPS) | ≥30 |
| **合规性** | 监管风险点清除率 | 100% |
| | 免责声明覆盖率 | 所有页面 |

---

## 📞 协作接口

- **任务分派**: 工部负责人根据本清单认领任务
- **进度追踪**: 使用 GitHub Projects 或 Todo 清单
- **阻塞上报**: 遇到问题 @御前首辅 (老爪) 协调内阁
- **质量门禁**: 所有 UI 变更必须通过御史台视觉审查 + 刑部合规审查

---

**状态**: 待工部接收并开始实施  
**最后更新**: 2026-04-19  
**文档维护**: 每完成一个任务更新状态，每周同步进度
