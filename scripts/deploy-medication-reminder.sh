#!/bin/bash
# 用药提醒云函数部署脚本
# 版本: v0.1.0
# 生成时间: 2026-04-19
# 项目: parents-weekly-briefing

set -e

echo "=========================================="
echo "用药提醒云函数部署"
echo "版本: v0.1.0"
echo "时间: 2026-04-19"
echo "=========================================="

# 1. 检查环境
echo "[1/6] 检查环境..."
if ! command -v wx &> /dev/null; then
    echo "❌ 未找到微信开发者工具 CLI (wx)"
    echo "请先安装: npm install -g @wechat-miniprogram/cli"
    exit 1
fi
echo "✅ 微信CLI工具已安装"

# 2. 登录
echo "[2/6] 检查登录状态..."
if wx login --check 2>/dev/null; then
    echo "✅ 已登录"
else
    echo "需要登录微信开发者工具..."
    wx login
fi

# 3. 选择环境
echo "[3/6] 选择云开发环境..."
echo "可用的云开发环境："
echo "---"
wx cloud env list 2>/dev/null || echo "（无法自动获取，请手动输入）"
echo "---"
read -p "请输入环境ID: " ENV_ID
if [ -z "$ENV_ID" ]; then
    echo "❌ 环境ID不能为空"
    exit 1
fi
echo "✅ 环境ID: $ENV_ID"

# 4. 部署云函数
echo "[4/6] 部署云函数..."
cd "$(dirname "$0")/../cloudfunctions/medication-reminder"

# 安装依赖
if [ -f "package.json" ]; then
    echo "安装依赖..."
    npm install --production --silent
fi

# 上传云函数
echo "上传 medication-reminder 云函数..."
if wx cloud deploy --env "$ENV_ID" --name medication-reminder --config "./" 2>&1 | tee /tmp/deploy.log; then
    echo "✅ 云函数上传成功"
else
    echo "❌ 云函数上传失败，查看日志: /tmp/deploy.log"
    exit 1
fi

# 5. 配置触发器（需要用户手动确认）
echo ""
echo "[5/6] 定时触发器配置"
echo "重要：需要手动在云开发控制台配置触发器，或使用以下命令："
echo ""
echo "方案A - 控制台配置（推荐）："
echo "1. 登录微信云开发控制台"
echo "2. 进入 云函数 → medication-reminder → 触发器"
echo "3. 添加定时触发器"
echo "  类型：定时触发器"
echo "  Cron表达式：0 0 8,13,18,22 * * *"
echo "  名称：medication-reminder-timer"
echo ""
echo "方案B - CLI配置（如果支持）："
echo "wx cloud trigger create \\"
echo "  --env $ENV_ID \\"
echo "  --function medication-reminder \\"
echo "  --type timer \\"
echo "  --config '0 0 8,13,18,22 * * *'"
echo ""

read -p "是否已配置触发器？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  请先配置触发器再继续后续步骤"
fi

# 6. 环境变量配置
echo ""
echo "[6/6] 环境变量配置"
echo "请在云开发控制台设置以下环境变量："
echo "----------------------------------------"
echo "变量名: TEMPLATE_ID_MED_REMINDER"
echo "值: 您的订阅消息模板ID（从微信公众平台获取）"
echo "----------------------------------------"
echo ""
echo "获取模板ID步骤："
echo "1. 访问 https://mp.weixin.qq.com"
echo "2. 功能 → 订阅消息 → 我的模板"
echo "3. 选择「用药提醒」类模板"
echo "4. 复制模板ID（格式：如 ABC123xxxx）"
echo ""

read -p "是否已配置环境变量？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  请先配置环境变量再测试"
fi

# 7. 数据库初始化提示
echo ""
echo "=========================================="
echo "📋 后续配置步骤"
echo "=========================================="
echo ""
echo "步骤1：创建数据库集合（在云开发控制台）"
echo "  - medication_plans (用药计划)"
echo "  - medication_records (用药记录)"
echo "  - reminder_logs (提醒日志)"
echo ""
echo "步骤2：配置父母端openid绑定"
echo "  需要让父母在小程序端授权登录，记录wechat_openid"
echo ""
echo "步骤3：测试验证"
echo "  方法A：控制台手动触发云函数"
echo "  方法B：等待定时触发器自动执行"
echo "  查看日志：wx cloud log --env $ENV_ID --name medication-reminder"
echo ""
echo "=========================================="
echo "✅ 部署脚本执行完成"
echo "=========================================="
