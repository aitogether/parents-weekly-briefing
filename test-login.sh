#!/bin/bash

# 测试云函数登录接口
echo "🧪 测试 login 云函数..."

# 检查云函数是否存在
if [ ! -d "cloudfunctions/login" ]; then
    echo "❌ cloudfunctions/login 目录不存在"
    exit 1
fi

if [ ! -f "cloudfunctions/login/index.js" ]; then
    echo "❌ cloudfunctions/login/index.js 文件不存在"
    exit 1
fi

echo "✅ 云函数目录结构正确"

# 检查package.json
if [ -f "cloudfunctions/login/package.json" ]; then
    echo "✅ package.json 存在"
else
    echo "❌ package.json 缺失"
    exit 1
fi

# 语法检查
cd cloudfunctions/login
if node -c index.js; then
    echo "✅ index.js 语法正确"
else
    echo "❌ index.js 有语法错误"
    exit 1
fi

cd ../..

echo ""
echo "🎉 登录页面基础验证完成！"

# 检查前端页面
echo "📱 检查前端页面..."
if [ -f "miniprogram/pages/login/login.js" ]; then
    echo "✅ login.js 创建成功"
    if node -c miniprogram/pages/login/login.js; then
        echo "✅ login.js 语法正确"
    else
        echo "❌ login.js 有语法错误"
    fi
else
    echo "❌ login.js 文件缺失"
fi

if [ -f "miniprogram/pages/login/login.wxml" ]; then
    echo "✅ login.wxml 创建成功"
else
    echo "❌ login.wxml 文件缺失"
fi

if [ -f "miniprogram/pages/login/login.wxss" ]; then
    echo "✅ login.wxss 创建成功"
else
    echo "❌ login.wxss 文件缺失"
fi

echo ""
echo "💡 下一步：更新 app.json 添加登录页路由"