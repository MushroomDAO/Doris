#!/bin/bash

# Doris Protocol 一键启动脚本
# 同时启动Express服务器和Docsify服务器

set -e

echo "🚀 启动 Doris Protocol..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    pnpm install
fi

# 设置文件描述符限制（解决 EMFILE 错误）
echo "🔧 配置系统参数..."
ulimit -n 4096

# 创建日志目录
mkdir -p logs

echo "🌐 启动服务器..."

# 启动Express服务器（后台运行）
echo "启动Express服务器 (端口 3001)..."
nohup pnpm run dev > logs/express.log 2>&1 &
EXPRESS_PID=$!

# 等待Express服务器启动
sleep 2

# 启动Docsify服务器（后台运行）
echo "启动Docsify服务器 (端口 3000)..."
nohup pnpm run serve:blog > logs/docsify.log 2>&1 &
DOCSIFY_PID=$!

# 等待服务启动
sleep 3

# 检查服务状态
echo "🔍 检查服务状态..."

if curl -s http://localhost:3001/api/posts > /dev/null 2>&1; then
    echo "✅ Express API 服务器运行正常 (http://localhost:3001)"
else
    echo "❌ Express 服务器启动失败"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Docsify 博客服务器运行正常 (http://localhost:3000)"
else
    echo "❌ Docsify 服务器启动失败"
fi

# 保存PID到文件
echo $EXPRESS_PID > logs/express.pid
echo $DOCSIFY_PID > logs/docsify.pid

echo ""
echo "🎉 Doris Protocol 启动完成!"
echo ""
echo "📋 服务地址："
echo "  📖 博客访问：    http://localhost:3000"
echo "  🎛️ 简单管理：    http://localhost:3001/app/admin/admin.html"
echo "  🚀 专业管理：    http://localhost:3001/app/admin/admin-pro.html"
echo "  📊 API接口：     http://localhost:3001/api"
echo ""
echo "📁 日志文件："
echo "  Express: logs/express.log"
echo "  Docsify: logs/docsify.log"
echo ""
echo "🛑 停止服务："
echo "  ./stop.sh"
echo ""

# 可选：自动打开浏览器
if command -v open &> /dev/null; then
    read -p "是否自动打开浏览器？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open http://localhost:3000
        open http://localhost:3001/app/admin/admin.html
    fi
fi

echo "✨ 服务已在后台运行，按 Ctrl+C 退出脚本（服务会继续运行）"

# 保持脚本运行以显示日志
trap 'echo "脚本退出，服务继续在后台运行..."; exit 0' INT

tail -f logs/express.log &
tail -f logs/docsify.log &

wait 