#!/bin/bash

# Doris Protocol 停止脚本

echo "🛑 停止 Doris Protocol 服务..."

# 从PID文件读取进程ID并停止
if [ -f "logs/express.pid" ]; then
    EXPRESS_PID=$(cat logs/express.pid)
    if ps -p $EXPRESS_PID > /dev/null 2>&1; then
        kill $EXPRESS_PID
        echo "✅ Express 服务器已停止 (PID: $EXPRESS_PID)"
    fi
    rm -f logs/express.pid
fi

if [ -f "logs/docsify.pid" ]; then
    DOCSIFY_PID=$(cat logs/docsify.pid)
    if ps -p $DOCSIFY_PID > /dev/null 2>&1; then
        kill $DOCSIFY_PID
        echo "✅ Docsify 服务器已停止 (PID: $DOCSIFY_PID)"
    fi
    rm -f logs/docsify.pid
fi

# 强制停止所有可能的相关进程
echo "🔍 检查并清理残留进程..."

# 停止可能的Node.js进程
pkill -f "node.*src/server.js" 2>/dev/null || true
pkill -f "docsify serve" 2>/dev/null || true

# 检查端口是否已释放
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️ 端口 3001 仍被占用，尝试强制停止..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
fi

if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️ 端口 3000 仍被占用，尝试强制停止..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
fi

sleep 1

# 最终检查
if ! lsof -i :3001 > /dev/null 2>&1 && ! lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ 所有服务已成功停止"
else
    echo "⚠️ 某些服务可能仍在运行，请手动检查"
fi

echo "🎉 Doris Protocol 已停止" 