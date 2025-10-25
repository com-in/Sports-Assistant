#!/bin/bash

echo "=== 心率广播应用启动脚本 ==="
echo ""

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js。请先安装Node.js再运行此脚本。"
    exit 1
fi

echo "Node.js已安装"

# 进入后端目录并安装依赖
echo ""
echo "正在安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 安装后端依赖失败"
        exit 1
    fi
fi

# 启动后端服务
echo ""
echo "正在启动后端服务..."
npm start &
BACKEND_PID=$!

echo "后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端服务启动
sleep 3

# 提示用户如何访问前端
echo ""
echo "=== 应用已启动 ==="
echo "后端服务运行在: http://localhost:3000"
echo "请在浏览器中打开前端页面: frontend/index.html"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
wait $BACKEND_PID