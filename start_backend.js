const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 用户提供的Node.js路径
const NODE_PATH = '"C:\\Program Files\\nodejs\\node.exe"';
const NPM_PATH = '"C:\\Program Files\\nodejs\\npm.cmd"';

// 后端目录路径
const backendDir = path.join(__dirname, 'backend');

// 检查Node.js是否安装
function checkNodejs() {
    try {
        // 使用用户提供的Node.js路径
        execSync(`${NODE_PATH} -v`);
        console.log('Node.js 已安装，路径:', NODE_PATH.replace(/"/g, ''));
        return true;
    } catch (error) {
        console.error('错误: 无法使用 Node.js 路径:', NODE_PATH.replace(/"/g, ''));
        console.error('请确认Node.js已正确安装在指定路径。');
        return false;
    }
}

// 检查npm是否安装
function checkNpm() {
    try {
        // 使用用户提供的npm路径
        execSync(`${NPM_PATH} -v`);
        console.log('npm 已安装，路径:', NPM_PATH.replace(/"/g, ''));
        return true;
    } catch (error) {
        console.error('错误: 无法使用 npm 路径:', NPM_PATH.replace(/"/g, ''));
        console.error('请确认npm已正确安装。');
        return false;
    }
}

// 安装依赖
function installDependencies() {
    console.log('正在安装后端依赖...');
    try {
        // 使用用户提供的npm路径
        execSync(`${NPM_PATH} install`, { cwd: backendDir, stdio: 'inherit' });
        console.log('依赖安装成功');
        return true;
    } catch (error) {
        console.error('安装依赖失败:', error.message);
        return false;
    }
}

// 检查.env文件是否存在，如果不存在则创建一个
function checkEnvFile() {
    const envPath = path.join(backendDir, '.env');
    if (!fs.existsSync(envPath)) {
        console.log('未找到.env文件，正在创建...');
        const envContent = `MONGO_URI=mongodb://localhost:27017/heart_rate_monitor
PORT=3000
WS_PORT=8080
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h`;
        try {
            fs.writeFileSync(envPath, envContent);
            console.log('.env文件创建成功');
        } catch (error) {
            console.error('创建.env文件失败:', error.message);
        }
    }
}

// 启动后端服务
function startBackend() {
    console.log('正在启动后端服务...');
    
    // 使用spawn启动服务，保持输出，使用用户提供的Node.js路径
    const backendProcess = spawn(NODE_PATH.replace(/"/g, ''), ['server.js'], {
        cwd: backendDir,
        stdio: 'inherit'
    });
    
    backendProcess.on('error', (error) => {
        console.error('启动后端服务失败:', error.message);
    });
    
    backendProcess.on('close', (code) => {
        console.log(`后端服务已退出，退出码: ${code}`);
    });
    
    // 等待一段时间让服务启动
    setTimeout(() => {
        console.log('\n========================================');
        console.log('后端服务已启动');
        console.log('API地址: http://localhost:3000');
        console.log('WebSocket地址: ws://localhost:8080');
        console.log('========================================');
        console.log('请在浏览器中打开 frontend/index.html 文件以访问应用');
        console.log('========================================\n');
    }, 2000);
}

// 主函数
function main() {
    console.log('========================================');
    console.log('心率广播系统启动脚本');
    console.log('========================================');
    
    if (!checkNodejs() || !checkNpm()) {
        process.exit(1);
    }
    
    checkEnvFile();
    
    if (!installDependencies()) {
        process.exit(1);
    }
    
    startBackend();
}

// 运行主函数
main();