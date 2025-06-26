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

# 启动Express服务器（前台运行）
echo "启动Express服务器 (端口 3001)..."
pnpm run dev &
EXPRESS_PID=$!

# 等待Express服务器启动
sleep 2

# 启动Docsify服务器（前台运行）
echo "启动Docsify服务器 (端口 3000)..."
pnpm run serve:blog &
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

echo "✨ 服务已启动，按 Ctrl+C 停止所有服务"

# 设置信号处理，确保子进程也被终止
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $EXPRESS_PID $DOCSIFY_PID 2>/dev/null || true
    echo "✅ 所有服务已停止"
    exit 0
}

trap cleanup INT TERM

# 等待所有后台进程
wait 