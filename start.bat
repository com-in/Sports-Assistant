@echo off

echo === 心率广播应用启动脚本 ===
echo.

:: 检查是否安装了Node.js
where node > nul 2> nul
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js。请先安装Node.js再运行此脚本。
    pause
    exit /b 1
)

echo Node.js已安装

:: 进入后端目录并安装依赖
echo.
echo 正在安装后端依赖...
cd backend
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 安装后端依赖失败
        pause
        exit /b 1
    )
)

:: 启动后端服务
echo.
echo 正在启动后端服务...
start "心率广播后端服务" npm start

:: 等待后端服务启动
ping -n 4 127.0.0.1 > nul

:: 提示用户如何访问前端
echo.
echo === 应用已启动 ===
echo 后端服务运行在: http://localhost:3000
echo 请在浏览器中打开前端页面: frontend/index.html
echo.
echo 提示: 您可以通过关闭打开的命令窗口来停止后端服务
echo 按任意键继续...
pause > nul

:: 尝试打开前端页面（可选）
start "心率广播前端" "../frontend/index.html"