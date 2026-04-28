#!/bin/bash

# 父母这一周 - 新功能验证脚本
echo "🚀 父母这一周 - 新功能验证测试"
echo "=================================="

# 检查项目结构
echo ""
echo "📁 项目结构检查:"
echo "✅ 登录页面: $(test -f miniprogram/pages/login/login.js && echo '存在' || echo '缺失')"
echo "✅ 用药页面: $(test -f miniprogram/pages/medication/medication.js && echo '存在' || echo '缺失')"
echo "✅ 扫码页面: $(test -f miniprogram/pages/qrscan/qrscan.js && echo '存在' || echo '缺失')"
echo "✅ 叫车页面: $(test -f miniprogram/pages/taxi/taxi.js && echo '存在' || echo '缺失')"
echo "✅ 应用配置: $(test -f miniprogram/app.json && echo '存在' || echo '缺失')"

# 检查语法正确性
echo ""
echo "🔍 语法检查:"
for file in miniprogram/pages/login/login.js \
             miniprogram/pages/medication/medication.js \
             miniprogram/pages/qrscan/qrscan.js \
             miniprogram/pages/taxi/taxi.js; do
    if test -f "$file"; then
        if node -c "$file" > /dev/null 2>&1; then
            echo "✅ $file - 语法正确"
        else
            echo "❌ $file - 语法错误"
        fi
    fi
done

# 检查云函数
echo ""
echo "☁️ 云函数检查:"
cloud_functions=("login" "medication" "qrscan" "taxi")
for func in "${cloud_functions[@]}"; do
    if [ -d "cloudfunctions/$func" ] && [ -f "cloudfunctions/$func/index.js" ]; then
        echo "✅ cloudfunctions/$func - 目录完整"
        if [ -f "cloudfunctions/$func/package.json" ]; then
            echo "   └─ package.json 存在"
        fi
        cd "cloudfunctions/$func" && \
        if node -c index.js > /dev/null 2>&1; then
            echo "   └─ index.js 语法正确"
        else
            echo "   └─ index.js 有语法问题"
        fi && \
        cd ../..
    else
        echo "❌ cloudfunctions/$func - 目录或文件缺失"
    fi
done

# 统计结果
echo ""
echo "📊 统计摘要:"
total_pages=$(find miniprogram/pages -name "*.js" | wc -l)
total_funcs=$(ls cloudfunctions/ | grep -v common | wc -l)
echo "📱 前端页面: $total_pages 个"
echo "☁️  后端功能: $total_funcs 个"

# 编译测试
echo ""
echo "🧪 编译测试:"
if node -c miniprogram/app.json > /dev/null 2>&1; then
    echo "✅ app.json 配置正确"
else
    echo "❌ app.json 配置错误"
fi

echo ""
echo "🎉 验证完成！"
echo "💡 建议: 使用微信开发者工具打开项目进行真机测试"