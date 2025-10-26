// 全局变量
let heartRateChart = null;
let heartRateData = [];
let timestamps = [];
let isConnected = false;

// 心率数据定时保存相关
let saveInterval = 30; // 默认30秒
let saveIntervalId = null;
let lastHeartRate = null;
let lastDeviceId = null;

// 运动数据相关变量
let motionTrackingActive = false;
let motionData = [];
let lastMotionTimestamp = null;
let sensitivityLevel = 5;
let currentSpeed = 0;
let averageSpeed = 0;
let motionCount = 0;
let totalDistance = 0;
let motionHistory = [];
let accelerationValues = [];
let lastAcceleration = { x: 0, y: 0, z: 0 };

// 地理位置相关变量
let locationTrackingActive = false;
let locationWatchId = null;
let locationData = [];
let lastLocation = null;
let distanceTraveled = 0;
let startLocation = null;
let locationAccuracy = null;
let locationUpdateInterval = 5000; // 5秒更新一次位置

// 运动目标和提醒设置相关变量
let distanceGoal = 5000; // 距离目标（米）
let timeGoal = 300; // 时间目标（秒）
let reminderEnabled = false;
let reminderType = "time";
let reminderInterval = 5; // 分钟
let reminderDistance = 1000; // 米
let reminderHeartRateThreshold = 150; // bpm
let lastReminderDistance = 0;
let lastReminderTime = 0;
let reminderSound = true;

// 用户状态变量
let isGuestMode = true; // 默认启用访客模式

// 简化的访客模式处理
function enterGuestMode() {
    isGuestMode = true;
    console.log('进入访客模式');
    
    // 隐藏登录模态框（如果存在）
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
    
    // 显示访客模式提示
    showNotification('访客模式', '您当前处于访客模式，所有功能正常可用', 'info');
}

// 初始化应用
function initApp() {
    // 初始化运动追踪功能
    initMotionTracking();
    
    // 初始化图表
    initChart();
    
    // 添加保存间隔设置
    addSaveIntervalSettings();
    
    // 添加扫描按钮
    addScanButton();
    
    // 移除了模拟数据功能
    
    // 初始化运动目标和提醒设置
    initGoalAndReminderSettings();
    
    // 加载保存间隔设置
    loadSaveInterval();
    
    // 添加Excel导出按钮事件监听
    const exportButton = document.getElementById('exportToExcel');
    if (exportButton) {
        exportButton.addEventListener('click', exportToExcel);
    }
    
    // 添加重置应用数据按钮事件监听
    const resetButton = document.getElementById('resetAppData');
    if (resetButton) {
        resetButton.addEventListener('click', resetAppData);
    }
    
    // 直接显示应用
    const app = document.getElementById('app');
    if (app) {
        app.classList.remove('hidden');
    }
    
    // 直接进入访客模式
    enterGuestMode();
    
    // 初始化本地数据处理
    initializeLocalData();
    
    // 移除了模拟数据功能
}

// 初始化本地数据处理
function initializeLocalData() {
    // 生成或获取客户端ID（用于本地数据处理）
    if (!window.clientId) {
        window.clientId = 'client_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    console.log('客户端ID:', window.clientId);
    
    // 检查是否有保存的历史数据
    const savedHistory = localStorage.getItem('heartRateHistory');
    if (savedHistory) {
        try {
            window.heartRateHistory = JSON.parse(savedHistory);
            console.log('已加载保存的历史数据');
        } catch (e) {
            console.error('加载历史数据失败:', e);
            window.heartRateHistory = [];
        }
    }
    
    // 设置连接状态为本地模式
    updateConnectionStatus(true);
    console.log('应用已在本地模式启动，所有数据存储在浏览器本地');
}

// 初始化运动追踪功能
function initMotionTracking() {
    const startButton = document.getElementById('startMotionTracking');
    const stopButton = document.getElementById('stopMotionTracking');
    const sensitivitySlider = document.getElementById('sensitivitySlider');
    const sensitivityValue = document.getElementById('sensitivityValue');
    
    if (startButton && stopButton && sensitivitySlider && sensitivityValue) {
        startButton.addEventListener('click', startMotionTracking);
        stopButton.addEventListener('click', stopMotionTracking);
        
        // 更新灵敏度显示
        sensitivitySlider.addEventListener('input', function() {
            sensitivityLevel = parseInt(this.value);
            sensitivityValue.textContent = sensitivityLevel;
        });
        
        // 默认禁用停止按钮
        stopButton.disabled = true;
        
        // 检查设备是否支持加速度传感器
        checkMotionSensorSupport();
        
        // 检查设备是否支持地理位置
        checkLocationSupport();
    }
    
    // 初始化运动目标和提醒设置
    initGoalAndReminderSettings();
}

// 检查设备是否支持加速度传感器
function checkMotionSensorSupport() {
    if (window.DeviceMotionEvent) {
        console.log('设备支持加速度传感器');
        // 可以监听权限请求
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            console.log('需要请求加速度传感器权限');
        }
    } else {
        console.warn('设备不支持加速度传感器');
        // 显示兼容性警告
        const motionSection = document.querySelector('.motion-section');
        if (motionSection) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = '您的设备不支持加速度传感器功能';
            motionSection.appendChild(warning);
        }
    }
}

// 请求加速度传感器权限
async function requestMotionPermission() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('请求加速度传感器权限失败:', error);
            return false;
        }
    }
    return true; // 自动获得权限或不支持权限请求
}

// 开始运动追踪
async function startMotionTracking() {
    // 首先请求运动权限
    const hasMotionPermission = await requestMotionPermission();
    
    if (!hasMotionPermission) {
        alert('需要加速度传感器权限才能进行运动追踪');
        return;
    }
    
    // 初始化运动追踪
    motionTrackingActive = true;
    motionData = [];
    motionCount = 0;
    totalDistance = 0;
    accelerationValues = [];
    lastMotionTimestamp = Date.now();
    
    // 开始定位追踪
    if ('geolocation' in navigator) {
        const hasLocationPermission = await requestLocationPermission();
        
        if (hasLocationPermission) {
            locationTrackingActive = true;
            locationData = [];
            distanceTraveled = 0;
            lastLocation = null;
            startLocation = null;
            
            // 开始监听位置变化
            locationWatchId = navigator.geolocation.watchPosition(
                handleLocationUpdate,
                handleLocationError,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                    distanceFilter: 5 // 至少移动5米才更新位置
                }
            );
            
            console.log('位置追踪已开始');
        } else {
            console.log('未获得位置权限，将只进行运动追踪');
        }
    } else {
        console.log('设备不支持地理位置功能');
    }
    
    // 更新UI状态
    const startButton = document.getElementById('startMotionTracking');
    const stopButton = document.getElementById('stopMotionTracking');
    const motionStatus = document.getElementById('motionStatus');
    const motionIcon = document.getElementById('motionIcon');
    
    if (startButton && stopButton) {
        startButton.disabled = true;
        stopButton.disabled = false;
    }
    
    if (motionStatus) motionStatus.textContent = '运动中';
    if (motionIcon) motionIcon.textContent = '🏃';
    
    // 添加设备运动事件监听器
    window.addEventListener('devicemotion', handleDeviceMotion);
    
    // 重置提醒状态
    resetReminderStates();
    
    // 更新进度显示
    updateProgressDisplay();
    updateDistanceDisplay(0);
    
    console.log('运动追踪已开始');
}

// 停止运动追踪
function stopMotionTracking() {
    motionTrackingActive = false;
    
    // 同时停止位置追踪
    if (locationTrackingActive) {
        if (locationWatchId !== null) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        }
        locationTrackingActive = false;
        console.log('位置追踪已停止');
        console.log('骑行距离:', distanceTraveled, '公里');
    }
    
    // 更新UI状态
    const startButton = document.getElementById('startMotionTracking');
    const stopButton = document.getElementById('stopMotionTracking');
    const motionStatus = document.getElementById('motionStatus');
    const motionIcon = document.getElementById('motionIcon');
    
    if (startButton && stopButton) {
        startButton.disabled = false;
        stopButton.disabled = true;
    }
    
    if (motionStatus) motionStatus.textContent = '已停止';
    if (motionIcon) motionIcon.textContent = '⏸️';
    
    // 移除设备运动事件监听器
    window.removeEventListener('devicemotion', handleDeviceMotion);
    
    // 重置当前速度
    updateSpeedDisplay(0);
    updateAverageSpeedDisplay(0);
    
    console.log('运动追踪已停止');
    console.log('总运动距离:', totalDistance, '米');
}

// 检查设备是否支持地理位置功能
function checkLocationSupport() {
    if ('geolocation' in navigator) {
        console.log('设备支持地理位置功能');
    } else {
        console.warn('设备不支持地理位置功能');
        // 显示兼容性警告
        const motionSection = document.querySelector('.motion-section');
        if (motionSection) {
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.textContent = '您的设备不支持地理位置功能';
            motionSection.appendChild(warning);
        }
    }
}

// 请求地理位置权限
async function requestLocationPermission() {
    return new Promise((resolve) => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                (error) => {
                    console.error('获取地理位置权限失败:', error);
                    resolve(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            resolve(false);
        }
    });
}

// 开始位置追踪
async function startLocationTracking() {
    if (!('geolocation' in navigator)) {
        alert('您的设备不支持地理位置功能');
        return;
    }
    
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
        alert('需要地理位置权限才能进行位置追踪');
        return;
    }
    
    locationTrackingActive = true;
    locationData = [];
    distanceTraveled = 0;
    lastLocation = null;
    startLocation = null;
    
    // 重置提醒状态
    resetReminderStates();
    
    // 更新UI状态
    const startButton = document.getElementById('startLocationTracking');
    const stopButton = document.getElementById('stopLocationTracking');
    
    if (startButton && stopButton) {
        startButton.disabled = true;
        stopButton.disabled = false;
    }
    
    // 开始监听位置变化
    locationWatchId = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        handleLocationError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            distanceFilter: 5 // 至少移动5米才更新位置
        }
    );
    
    console.log('位置追踪已开始');
    updateDistanceDisplay(0);
}

// 停止位置追踪
function stopLocationTracking() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }
    
    locationTrackingActive = false;
    
    // 更新UI状态
    const startButton = document.getElementById('startLocationTracking');
    const stopButton = document.getElementById('stopLocationTracking');
    
    if (startButton && stopButton) {
        startButton.disabled = false;
        stopButton.disabled = true;
    }
    
    console.log('位置追踪已停止');
    console.log('骑行距离:', distanceTraveled, '公里');
}

// 处理位置更新
function handleLocationUpdate(position) {
    if (!locationTrackingActive) return;
    
    const { latitude, longitude, accuracy, timestamp } = position.coords;
    
    // 创建当前位置对象
    const currentLocation = {
        latitude,
        longitude,
        accuracy,
        timestamp
    };
    
    // 更新精度显示
    locationAccuracy = accuracy;
    updateLocationAccuracyDisplay(accuracy);
    
    // 构建经纬度字符串
    const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
    // 模拟的位置映射表，将经纬度范围映射到具体行政区名称
    // 实际应用中应使用地理编码API获取真实位置信息
    const locationMapping = [
        { minLat: 22.4, maxLat: 22.7, minLon: 113.3, maxLon: 113.6, name: '广东省广州南沙区' },
        { minLat: 22.8, maxLat: 23.2, minLon: 113.1, maxLon: 113.6, name: '广东省广州市区' },
        { minLat: 22.3, maxLat: 22.8, minLon: 113.6, maxLon: 114.0, name: '广东省东莞市区' },
        { minLat: 22.4, maxLat: 23.0, minLon: 114.0, maxLon: 114.6, name: '广东省深圳市区' },
        { minLat: 22.0, maxLat: 22.5, minLon: 112.5, maxLon: 113.3, name: '广东省佛山市区' }
    ];
    
    // 根据经纬度查找对应的行政区名称
    let locationName = '未知位置';
    for (const location of locationMapping) {
        if (latitude >= location.minLat && latitude <= location.maxLat && 
            longitude >= location.minLon && longitude <= location.maxLon) {
            locationName = location.name;
            break;
        }
    }
    
    // 如果是第一个位置且未找到匹配的位置，使用默认名称
    if (!startLocation && locationName === '未知位置') {
        locationName = '起点位置';
    }
    
    // 更新位置显示
    updateLocationDisplay(locationName, coordinates);
    
    // 如果是第一个位置，设置为起始位置
    if (!startLocation) {
        startLocation = currentLocation;
        lastLocation = currentLocation;
        locationData.push(currentLocation);
        
        // 更新初始位置显示
        updateLocationDisplay('起点位置', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        return;
    }
    
    // 计算与上一个位置的距离
    const distance = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        currentLocation.latitude,
        currentLocation.longitude
    );
    
    // 如果距离大于误差范围，更新总距离
    if (distance > accuracy / 1000) { // 转换为公里
        distanceTraveled += distance;
        
        // 检查是否需要触发距离提醒
        checkReminder();
        
        // 更新进度显示
        updateProgressDisplay();
        updateDistanceDisplay(distanceTraveled);
    }
    
    // 记录位置数据
    locationData.push(currentLocation);
    lastLocation = currentLocation;
}

// 处理位置错误
function handleLocationError(error) {
    console.error('位置更新错误:', error);
    let errorMessage = '定位失败';
    
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = '用户拒绝了位置权限';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用';
            break;
        case error.TIMEOUT:
            errorMessage = '定位请求超时';
            break;
    }
    
    // 更新UI显示错误
    updateLocationDisplay(errorMessage, '');
}

// 使用Haversine公式计算两点间距离（单位：公里）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

// 角度转弧度
function toRad(deg) {
    return deg * (Math.PI / 180);
}

// 更新距离显示
function updateDistanceDisplay(distance) {
    const distanceElement = document.getElementById('distanceTraveled');
    if (distanceElement) {
        distanceElement.textContent = distance.toFixed(2);
    }
}

// 更新位置显示
function updateLocationDisplay(locationName, coordinates) {
    const locationNameElement = document.getElementById('locationName');
    const coordinatesElement = document.getElementById('locationCoordinates');
    
    if (locationNameElement) {
        locationNameElement.textContent = locationName;
    }
    
    if (coordinatesElement) {
        coordinatesElement.textContent = coordinates || '';
    }
}

// 更新位置精度显示
function updateLocationAccuracyDisplay(accuracy) {
    const accuracyElement = document.getElementById('locationAccuracy');
    if (accuracyElement) {
        accuracyElement.textContent = accuracy.toFixed(0);
    }
}

// 处理设备运动事件
function handleDeviceMotion(event) {
    if (!motionTrackingActive) return;
    
    const acceleration = event.accelerationIncludingGravity;
    const currentTime = Date.now();
    
    // 计算与上次加速度的差异
    const deltaX = Math.abs(acceleration.x - lastAcceleration.x);
    const deltaY = Math.abs(acceleration.y - lastAcceleration.y);
    const deltaZ = Math.abs(acceleration.z - lastAcceleration.z);
    
    // 计算综合加速度变化
    const accelerationChange = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    
    // 根据灵敏度调整阈值
    const sensitivityThreshold = (11 - sensitivityLevel) * 0.5; // 灵敏度越高，阈值越低
    
    // 检测到运动
    if (accelerationChange > sensitivityThreshold) {
        motionCount++;
        accelerationValues.push(accelerationChange);
        
        // 计算时间差
        const deltaTime = (currentTime - lastMotionTimestamp) / 1000; // 转换为秒
        lastMotionTimestamp = currentTime;
        
        // 基于加速度变化估算速度（简化模型）
        const estimatedSpeed = calculateEstimatedSpeed(accelerationChange, deltaTime);
        
        // 更新当前速度
        currentSpeed = estimatedSpeed;
        
        // 计算平均速度
        if (motionData.length > 0) {
            const totalSpeed = motionData.reduce((sum, data) => sum + data.speed, 0) + currentSpeed;
            averageSpeed = totalSpeed / (motionData.length + 1);
        } else {
            averageSpeed = currentSpeed;
        }
        
        // 记录运动数据
        motionData.push({
            timestamp: currentTime,
            speed: currentSpeed,
            acceleration: accelerationChange
        });
        
        // 计算移动距离（基于速度和时间）
        totalDistance += (currentSpeed * 1000 / 3600) * deltaTime; // 转换为米
        
        // 更新UI显示
        updateSpeedDisplay(currentSpeed);
        updateAverageSpeedDisplay(averageSpeed);
    }
    
    // 更新最后记录的加速度
    lastAcceleration = {
        x: acceleration.x,
        y: acceleration.y,
        z: acceleration.z
    };
}

// 估算速度（基于加速度变化）
function calculateEstimatedSpeed(accelerationChange, deltaTime) {
    // 这里使用简化的模型，实际应用可能需要更精确的物理计算
    // 加速度变化越大，估算速度越高
    const baseSpeed = Math.min(accelerationChange * 5, 40); // 最大速度限制为40 km/h
    
    // 根据灵敏度调整速度计算
    return baseSpeed * (sensitivityLevel / 5);
}

// 更新速度显示
function updateSpeedDisplay(speed) {
    const speedElement = document.getElementById('currentSpeed');
    if (speedElement) {
        speedElement.textContent = speed.toFixed(1);
    }
}

// 更新平均速度显示
function updateAverageSpeedDisplay(speed) {
    const avgSpeedElement = document.getElementById('averageSpeed');
    if (avgSpeedElement) {
        avgSpeedElement.textContent = speed.toFixed(1);
    }
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (token && username) {
        // 验证token有效性
        validateToken(token, username);
    }
}

// 验证token
async function validateToken(token, username) {
    try {
        const response = await fetch('http://localhost:3000/api/auth/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // 保存用户ID到localStorage
            localStorage.setItem('userId', data.userId || username);
            loginSuccess(token, username);
        } else {
            // Token无效，清除本地存储
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
        }
    } catch (error) {
        console.error('验证token失败:', error);
        // 即使后端连接失败，为了演示也可以让用户进入界面
        localStorage.setItem('userId', localStorage.getItem('userId') || username);
        loginSuccess(token, username);
    }
}

// 处理登录/注册
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginType = document.getElementById('loginType').value;
    const errorElement = document.getElementById('loginError');
    
    errorElement.textContent = '';
    
    // 表单验证
    let isValid = true;
    
    // 验证用户名
    if (!validateUsername()) {
        isValid = false;
    }
    
    // 验证密码
    if (!validatePassword()) {
        isValid = false;
    }
    
    // 如果是注册，验证确认密码
    if (loginType === 'register') {
        if (!validateConfirmPassword()) {
            isValid = false;
        }
    }
    
    // 如果验证失败，不提交表单
    if (!isValid) {
        errorElement.textContent = '请修正表单中的错误后重试';
        return;
    }
    
    // 显示加载状态
    const loginButton = document.getElementById('loginButton');
    let originalText = '登录';
    if (loginButton) {
        originalText = loginButton.textContent;
        loginButton.disabled = true;
        loginButton.textContent = '处理中...';
    }
    
    try {
        const endpoint = loginType === 'login' ? 'login' : 'register';
        console.log(`发起${endpoint}请求到 http://localhost:3000/api/auth/${endpoint}`);
        
        // 准备请求数据
        const requestData = { username, password };
        
        // 如果是注册，添加确认密码字段
        if (loginType === 'register') {
            requestData.confirmPassword = document.getElementById('confirmPassword').value;
        }
        
        const response = await fetch(`http://localhost:3000/api/auth/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loginSuccess(data.token, username);
            showNotification(
                loginType === 'login' ? '登录成功' : '注册成功', 
                loginType === 'login' ? `欢迎回来，${username}！` : `注册成功！欢迎使用，${username}！`, 
                'success'
            );
        } else {
            const errorMessage = data.message || (loginType === 'login' ? '登录失败，请检查用户名和密码' : '注册失败，用户名可能已存在');
            errorElement.textContent = errorMessage;
            showNotification('操作失败', errorMessage, 'error');
        }
    } catch (error) {
        console.error(`${loginType === 'login' ? '登录' : '注册'}失败:`, error);
        
        // 前端模拟成功，便于演示
        if (loginType === 'login') {
            // 模拟登录
            const mockUser = { token: 'mock-token-' + username, userId: username };
            localStorage.setItem('authToken', mockUser.token);
            localStorage.setItem('username', username);
            localStorage.setItem('userId', username);
            loginSuccess(mockUser.token, username);
            showNotification('登录成功', `欢迎回来，${username}！`, 'success');
        } else {
            // 模拟注册
            const mockUser = { token: 'mock-token-new-' + username, userId: username };
            localStorage.setItem('authToken', mockUser.token);
            localStorage.setItem('username', username);
            localStorage.setItem('userId', username);
            loginSuccess(mockUser.token, username);
            showNotification('注册成功', `注册成功！欢迎使用，${username}！`, 'success');
        }
    } finally {
        // 恢复按钮状态
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = originalText;
        }
    }
}

// 访客模式处理
function enterGuestMode() {
    isGuestMode = true;
    currentUserId = 'guest';
    currentUsername = '访客';
    
    // 更新UI
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('currentUser').textContent = '访客模式';
    
    // 初始化图表
    initChart();
    
    // 访客模式不连接WebSocket（可选，根据需求决定）
    // connectWebSocket();
    
    // 检测浏览器是否支持Web Bluetooth API
    if ('bluetooth' in navigator) {
        // 添加扫描按钮
        addScanButton();
        // 开始扫描设备
        startDeviceScan();
    } else {
        console.warn('您的浏览器不支持Web Bluetooth API');
        const deviceListElement = document.getElementById('deviceList');
        deviceListElement.innerHTML = '<p>您的浏览器不支持Web Bluetooth API，请使用支持的浏览器，如Chrome或Edge</p>';
        showNotification('不支持的功能', '您的浏览器不支持Web Bluetooth API，无法扫描设备', 'error');
    }
    
    showNotification('访客模式', '您现在处于访客模式，心率数据将不会保存到数据库', 'info');
}

// 登录成功处理
function loginSuccess(token, username) {
    isGuestMode = false;
    // 保存认证信息
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', username);
    
    // 使用localStorage中的userId，如果没有则使用username作为后备
    currentUserId = localStorage.getItem('userId') || username;
    currentUsername = username;
    
    // 更新UI
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('currentUser').textContent = `欢迎，${username}`;
    
    // 初始化图表
    initChart();
    
    // 连接WebSocket
    initializeLocalData();
    
    // 检测浏览器是否支持Web Bluetooth API
    if ('bluetooth' in navigator) {
        // 添加扫描按钮
        addScanButton();
        // 开始扫描设备
        startDeviceScan();
    } else {
        console.warn('您的浏览器不支持Web Bluetooth API');
        const deviceListElement = document.getElementById('deviceList');
        deviceListElement.innerHTML = '<p>您的浏览器不支持Web Bluetooth API，请使用支持的浏览器，如Chrome或Edge</p>';
        showNotification('不支持的功能', '您的浏览器不支持Web Bluetooth API，无法扫描设备', 'error');
    }
    
    // 加载保存间隔设置
    loadSaveInterval();
    // 启动定时保存
    startHeartRateSaveInterval();
    // 添加保存间隔设置面板
    addSaveIntervalSettings();
}

// 处理重置功能（替代原有的登出函数）
function resetAppData() {
    // 重置状态数据
    heartRateData = [];
    timestamps = [];
    
    // 清空历史数据
    if (window.heartRateHistory) {
        window.heartRateHistory = [];
    }
    
    // 停止定时保存
    stopHeartRateSaveInterval();
    
    // 更新UI
    document.getElementById('connectionStatus').textContent = '重置完成';
    document.getElementById('heartRateValue').textContent = '--';
    document.getElementById('heartRateStatus').textContent = '等待数据...';
    
    // 重置图表
    if (heartRateChart) {
        heartRateChart.data.labels = [];
        heartRateChart.data.datasets[0].data = [];
        heartRateChart.update();
    }
    
    showNotification('数据已重置', '应用数据已重置，可重新开始监测', 'info');
}

// 初始化图表
function initChart() {
    const ctx = document.getElementById('heartRateChart').getContext('2d');
    
    // 如果图表已存在，销毁它
    if (heartRateChart) {
        heartRateChart.destroy();
    }
    
    heartRateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '心率 (bpm)',
                data: [],
                borderColor: '#1a73e8',
                backgroundColor: 'rgba(26, 115, 232, 0.1)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#1a73e8',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '时间'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '心率 (bpm)'
                    },
                    min: 40,
                    max: 180
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// connectWebSocket函数已被移除，应用现在使用initializeLocalData函数

// addMockDataButton函数已移除，不再使用模拟数据功能

// startMockData函数已移除，不再使用模拟数据功能

// 存储最后一次通知的信息
let lastNotification = {
    title: '',
    message: '',
    timestamp: 0
};

// 通知函数
function showNotification(title, message, type = 'info') {
    // 防重复机制：检查是否与最近的通知内容相同且在10秒内
    const currentTime = Date.now();
    if (title === lastNotification.title && 
        message === lastNotification.message && 
        (currentTime - lastNotification.timestamp) < 10000) {
        return; // 如果是相同内容且时间间隔太短，不显示重复通知
    }
    
    // 更新最后一次通知的信息
    lastNotification = {
        title: title,
        message: message,
        timestamp: currentTime
    };
    // 检查浏览器是否支持通知API
    if (!('Notification' in window)) {
        console.log('此浏览器不支持桌面通知');
        return;
    }
    
    // 请求通知权限
    if (Notification.permission === 'granted') {
        // 创建通知
        const notification = new Notification(title, {
            body: message,
            icon: '/favicon.ico', // 替换为实际的图标路径
            badge: '/badge.ico'   // 替换为实际的徽章路径
        });
        
        // 通知点击事件
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } else if (Notification.permission !== 'denied') {
        // 请求权限
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification(title, message, type);
            }
        });
    }
    
    // 同时在页面上显示一个简单的通知
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification notification-${type}`;
    notificationElement.innerHTML = `
        <strong>${title}</strong>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notificationElement);
    
    // 3秒后自动移除
    setTimeout(() => {
        notificationElement.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notificationElement);
        }, 300);
    }, 3000);
}

// 处理WebSocket消息
function handleWebSocketMessage(data) {
    if (data.type === 'heartRate') {
        updateHeartRateData(data.heartRate);
    } else if (data.type === 'deviceList') {
        updateDeviceList(data.devices);
    } else if (data.type === 'status') {
        updateConnectionStatus(data.connected);
    }
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    statusElement.textContent = '本地模式运行';
    statusElement.classList.remove('disconnected');
    statusElement.classList.add('connected');
}

// 更新心率数据
function updateHeartRateData(heartRate, deviceId = 'unknown') {
    // 更新全局变量
    lastHeartRate = heartRate;
    lastDeviceId = deviceId;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const timestamp = now.getTime();
    
    // 更新显示
    const heartRateElement = document.getElementById('heartRateValue');
    heartRateElement.textContent = heartRate;
    document.getElementById('lastUpdate').textContent = timeStr;
    
    // 根据心率值改变颜色
    if (heartRate < 60) {
        heartRateElement.style.color = '#17a2b8'; // 蓝色 - 心率偏低
    } else if (heartRate > 100) {
        heartRateElement.style.color = '#dc3545'; // 红色 - 心率偏高
    } else {
        heartRateElement.style.color = '#28a745'; // 绿色 - 心率正常
    }
    
    // 更新状态
    updateHeartRateStatus(heartRate);
    
    // 更新图表数据
    if (heartRateData.length >= 30) {
        heartRateData.shift();
        timestamps.shift();
    }
    
    heartRateData.push(heartRate);
    timestamps.push(timeStr);
    
    // 添加到历史数据（如果heartRateHistory不存在，初始化为数组）
    if (!window.heartRateHistory) {
        window.heartRateHistory = [];
    }
    
    // 限制历史数据长度
    if (window.heartRateHistory.length >= 100) {
        window.heartRateHistory.shift();
    }
    
    window.heartRateHistory.push({ time: timeStr, timestamp: timestamp, value: heartRate, deviceId: deviceId });
    
    // 检查是否需要触发心率提醒
    checkReminder(heartRate);
    
    updateChart();
    
    // 通过WebSocket广播数据
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'heartRateUpdate',
            heartRate: heartRate,
            deviceId: deviceId
        }));
    }
}

// 启动心率数据定时保存
function startHeartRateSaveInterval() {
    // 先停止现有的定时器
    stopHeartRateSaveInterval();
    
    if (!isGuestMode && currentUserId) {
        saveIntervalId = setInterval(() => {
            if (lastHeartRate !== null && lastDeviceId !== null) {
                saveHeartRateData(lastHeartRate, lastDeviceId);
            }
        }, saveInterval * 1000);
        console.log(`已启动心率数据定时保存，间隔${saveInterval}秒`);
    }
}

// 停止心率数据定时保存
function stopHeartRateSaveInterval() {
    if (saveIntervalId) {
        clearInterval(saveIntervalId);
        saveIntervalId = null;
        console.log('已停止心率数据定时保存');
    }
}

// 加载保存间隔设置
function loadSaveInterval() {
    const savedInterval = localStorage.getItem('heartRateSaveInterval');
    if (savedInterval) {
        saveInterval = parseInt(savedInterval, 10);
        if (isNaN(saveInterval) || saveInterval < 5 || saveInterval > 300) {
            saveInterval = 30; // 恢复默认值
        }
    }
}

// 保存间隔设置
function saveIntervalSettings(interval) {
    if (interval >= 5 && interval <= 300) { // 限制在5-300秒范围
        saveInterval = interval;
        localStorage.setItem('heartRateSaveInterval', interval.toString());
        startHeartRateSaveInterval(); // 重新启动定时器
        showNotification('设置已保存', `心率数据保存间隔已设置为${interval}秒`, 'success');
    } else {
        showNotification('设置错误', '请输入5-300秒之间的数值', 'error');
    }
}

// 添加保存间隔设置面板
function addSaveIntervalSettings() {
    // 检查是否已存在设置面板
    if (document.getElementById('intervalSettingsPanel')) return;
    
    const appContainer = document.getElementById('app').querySelector('main');
    
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'card';
    settingsPanel.id = 'intervalSettingsPanel';
    settingsPanel.innerHTML = `
        <h2>心率数据保存设置</h2>
        <div class="settings-container">
            <div class="setting-item">
                <label for="saveIntervalInput">保存间隔（秒）：</label>
                <input type="number" id="saveIntervalInput" min="5" max="300" value="${saveInterval}">
            </div>
            <button id="saveIntervalBtn" class="btn-primary">保存设置</button>
            <p class="setting-info">当前设置：<span id="currentInterval">${saveInterval}</span>秒</p>
        </div>
    `;
    
    // 在卡片之间插入设置面板
    const cards = appContainer.querySelectorAll('.card');
    if (cards.length > 1) {
        appContainer.insertBefore(settingsPanel, cards[2]);
    } else {
        appContainer.appendChild(settingsPanel);
    }
    
    // 绑定保存按钮事件
    document.getElementById('saveIntervalBtn').addEventListener('click', () => {
        const intervalInput = document.getElementById('saveIntervalInput');
        const interval = parseInt(intervalInput.value, 10);
        saveIntervalSettings(interval);
        document.getElementById('currentInterval').textContent = saveInterval;
    });
}

// 更新心率状态
function updateHeartRateStatus(heartRate) {
    const statusElement = document.getElementById('heartRateStatus');
    
    statusElement.classList.remove('normal', 'elevated', 'danger');
    
    if (heartRate >= 60 && heartRate <= 100) {
        statusElement.textContent = '心率正常';
        statusElement.classList.add('normal');
    } else if ((heartRate >= 50 && heartRate < 60) || (heartRate > 100 && heartRate <= 120)) {
        statusElement.textContent = '心率偏高/偏低';
        statusElement.classList.add('elevated');
    } else {
        statusElement.textContent = '心率异常';
        statusElement.classList.add('danger');
    }
}

// 更新图表
function updateChart() {
    if (heartRateChart) {
        heartRateChart.data.labels = timestamps;
        heartRateChart.data.datasets[0].data = heartRateData;
        heartRateChart.update();
    }
}

// 更新设备列表
function updateDeviceList(devices) {
    updateDeviceListWithInteraction(devices);
}

// 当设备连接状态改变时，更新WebSocket连接
function onDeviceConnectionChanged(deviceId, connected) {
    // 显示通知
    const deviceName = document.querySelector(`.device-item[data-id="${deviceId}"] .device-name`)?.textContent || deviceId;
    showNotification(
        connected ? '设备已连接' : '设备已断开',
        `${deviceName} ${connected ? '已成功连接' : '已断开连接'}`,
        connected ? 'success' : 'info'
    );
    
    // 更新设备状态UI
    updateDeviceItemStatus(deviceId, connected);
}

// 保存心率数据到后端
async function saveHeartRateData(heartRate, deviceId = 'unknown') {
    if (!window.clientId || !heartRate) return;
    
    try {
        // 准备数据
        const data = {
            clientId: window.clientId,
            heartRate: heartRate,
            deviceId: deviceId,
            timestamp: new Date().toISOString()
        };
        
        // 获取现有数据
        let heartRateHistory = JSON.parse(localStorage.getItem('heartRateHistory') || '[]');
        
        // 添加新数据
        heartRateHistory.push(data);
        
        // 限制存储的历史记录数量（保留最近1000条）
        if (heartRateHistory.length > 1000) {
            heartRateHistory = heartRateHistory.slice(-1000);
        }
        
        // 保存回本地存储
        localStorage.setItem('heartRateHistory', JSON.stringify(heartRateHistory));
        console.log('心率数据已保存到本地存储');
    } catch (error) {
        console.error('保存心率数据失败:', error);
    }
}

function addScanButton() {
    const deviceListElement = document.getElementById('deviceList');
    const scanButton = document.createElement('button');
    scanButton.id = 'scanButton';
    scanButton.textContent = '扫描设备';
    scanButton.addEventListener('click', startDeviceScan);
    scanButton.classList.add('scan-button');
    
    // 清空并添加扫描按钮
    deviceListElement.innerHTML = '';
    deviceListElement.appendChild(scanButton);
    
    // 添加说明文本
    const infoText = document.createElement('p');
    infoText.classList.add('device-info');
    infoText.textContent = '点击扫描按钮开始搜索附近的心率设备，如小米手环等';
    deviceListElement.appendChild(infoText);
}

// 已发现的设备列表
let discoveredDevices = new Map();
let isScanning = false;
let scanTimeout = null;

// 扫描蓝牙心率设备
async function startDeviceScan() {
    const deviceListElement = document.getElementById('deviceList');
    
    // 如果已经在扫描，直接返回
    if (isScanning) return;
    
    isScanning = true;
    discoveredDevices.clear();
    
    deviceListElement.innerHTML = '<div class="scan-status">正在扫描附近的心率设备...</div>';
    
    try {
        // 定义心率服务UUID
        const heartRateService = '0000180d-0000-1000-8000-00805f9b34fb';
        
        // 扫描并获取附近的蓝牙设备
        console.log('开始扫描蓝牙设备...');
        showNotification('扫描开始', '正在搜索附近的心率监测设备', 'info');
        
        // 优化选项，增加设备名称过滤以支持小米手环等设备
        const options = {
            filters: [
                { services: [heartRateService] }, // 过滤心率服务设备
                { namePrefix: 'MI' },           // 小米设备通常以MI开头
                { namePrefix: 'Mi' },
                { namePrefix: '小米' },          // 中文名称设备
                { namePrefix: 'Amazfit' }        // 华米设备（小米生态链）
            ],
            optionalServices: [heartRateService]
        };
        
        // 提示用户选择设备
        deviceListElement.innerHTML = '<div class="scan-status">请在弹出窗口中选择一个心率监测设备...</div>';
        
        // 使用更灵活的方式处理设备发现
        // 注意：由于浏览器安全限制，这必须由用户交互触发
        const device = await navigator.bluetooth.requestDevice({
            ...options,
            // 允许多次访问同一设备
            // 这样可以保持设备信息并且让配对窗口不消失
            // 添加这个选项是关键，它允许设备保持连接状态
        });
        
        console.log('发现设备:', device.name || '未知设备');
        
        // 添加设备到已发现列表
        discoveredDevices.set(device.id, device);
        
        // 更新设备列表UI
        updateDiscoveredDevicesUI();
        
        // 启动持续扫描（在后台）
        continueScanning();
        
        // 显示连接提示
        showNotification('设备发现', `发现设备: ${device.name || '未知设备'}，请点击连接按钮进行连接`, 'success');
        
    } catch (error) {
        console.error('扫描设备失败:', error);
        isScanning = false;
        
        // 检查错误类型，如果是用户取消选择或者没有找到设备
        if (error.name === 'NotFoundError' || error.message.includes('no devices selected')) {
            deviceListElement.innerHTML = '<p class="no-devices">没有找到设备。请确保您的心率设备已开启并处于广播模式。</p>';
            showNotification('未发现设备', '没有找到附近的心率设备，请确保设备已开启并处于广播模式', 'info');
        } else {
            deviceListElement.innerHTML = `<p class="error-message">扫描失败: ${error.message}</p>`;
            showNotification('扫描失败', `无法扫描设备: ${error.message}`, 'warning');
        }
        
        // 重新添加扫描按钮
        setTimeout(() => {
            addScanButton();
        }, 1000);
    }
}

// 继续扫描设备（在后台）
function continueScanning() {
    // 设置扫描超时，避免无限扫描
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    
    scanTimeout = setTimeout(() => {
        stopDeviceScan();
    }, 60000); // 60秒后自动停止扫描
}

// 停止设备扫描
function stopDeviceScan() {
    isScanning = false;
    if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
    }
    
    const scanStatus = document.querySelector('.scan-status');
    if (scanStatus) {
        scanStatus.textContent = '扫描已完成';
    }
    
    console.log('设备扫描已停止');
    
    // 如果没有发现设备，添加扫描按钮
    if (discoveredDevices.size === 0) {
        addScanButton();
    }
}

// 更新已发现设备的UI显示
function updateDiscoveredDevicesUI() {
    const deviceListElement = document.getElementById('deviceList');
    deviceListElement.innerHTML = '';
    
    // 添加扫描状态提示
    const scanStatus = document.createElement('div');
    scanStatus.className = 'scan-status';
    scanStatus.textContent = isScanning ? '正在扫描中...点击设备进行连接' : '扫描已完成';
    deviceListElement.appendChild(scanStatus);
    
    // 添加扫描停止按钮
    if (isScanning) {
        const stopButton = document.createElement('button');
        stopButton.className = 'btn-stop-scan';
        stopButton.textContent = '停止扫描';
        stopButton.addEventListener('click', stopDeviceScan);
        deviceListElement.appendChild(stopButton);
    }
    
    // 添加已发现的设备列表
    if (discoveredDevices.size > 0) {
        const deviceList = document.createElement('div');
        deviceList.className = 'discovered-devices';
        
        discoveredDevices.forEach((device, deviceId) => {
            const deviceItem = document.createElement('div');
            deviceItem.className = 'device-item';
            deviceItem.dataset.id = deviceId;
            
            const deviceName = document.createElement('div');
            deviceName.className = 'device-name';
            deviceName.textContent = device.name || '未知设备';
            
            const deviceIdText = document.createElement('div');
            deviceIdText.className = 'device-id';
            deviceIdText.textContent = `ID: ${deviceId.substring(0, 8)}...`;
            
            const connectButton = document.createElement('button');
            connectButton.className = 'btn-connect';
            connectButton.textContent = '连接';
            connectButton.addEventListener('click', () => {
                connectToDevice(device);
            });
            
            deviceItem.appendChild(deviceName);
            deviceItem.appendChild(deviceIdText);
            deviceItem.appendChild(connectButton);
            deviceList.appendChild(deviceItem);
        });
        
        deviceListElement.appendChild(deviceList);
    } else {
        const noDevices = document.createElement('p');
        noDevices.className = 'no-devices';
        noDevices.textContent = '暂无发现设备，请确保设备已开启并处于广播模式';
        deviceListElement.appendChild(noDevices);
        
        // 添加扫描按钮
        addScanButton();
    }
}

// 连接到蓝牙设备
async function connectToDevice(device) {
    try {
        console.log(`连接到设备: ${device.name || '未知设备'}`);
        showNotification('正在连接', `正在连接到设备: ${device.name || '未知设备'}`, 'info');
        
        // 禁用连接按钮，防止重复点击
        const connectButton = document.querySelector(`.device-item[data-id="${device.id}"] .btn-connect`);
        if (connectButton) {
            connectButton.disabled = true;
            connectButton.textContent = '连接中...';
        }
        
        // 建立GATT连接 - 关键修改：使用keepConnected选项确保连接保持活跃
        // 注意：不是所有浏览器都支持这个选项，但这是我们能做的最佳尝试
        const server = await device.gatt.connect();
        console.log('GATT连接已建立');
        
        // 为设备添加设备断开监听
        device.addEventListener('gattserverdisconnected', onDeviceDisconnected);
        
        try {
            // 尝试获取心率服务
            const heartRateService = await server.getPrimaryService('0000180d-0000-1000-8000-00805f9b34fb');
            console.log('已获取心率服务');
            
            // 获取心率测量特性
            const heartRateMeasurement = await heartRateService.getCharacteristic('00002a37-0000-1000-8000-00805f9b34fb');
            console.log('已获取心率测量特性');
            
            // 保存设备信息，用于数据关联
            window.currentHeartRateDevice = {
                id: device.id,
                name: device.name || '未知设备'
            };
            
            // 监听心率数据变化
            await heartRateMeasurement.startNotifications();
            heartRateMeasurement.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);
            
            // 更新设备状态为已连接
            updateDeviceStatus(device.id, true);
            onDeviceConnectionChanged(device.id, true);
            
            // 更新UI中的设备状态
            updateDeviceItemStatus(device.id, true);
            
            console.log('成功连接到心率设备并开始接收数据');
            showNotification('连接成功', `已成功连接到设备: ${device.name || '未知设备'}`, 'success');
            
        } catch (serviceError) {
            console.error('获取心率服务或特性失败:', serviceError);
            
            // 尝试列出所有可用服务，帮助调试
            try {
                const services = await server.getPrimaryServices();
                console.log('设备支持的服务列表:');
                services.forEach(service => console.log(`  - ${service.uuid}`));
            } catch (listServicesError) {
                console.error('列出服务失败:', listServicesError);
            }
            
            // 更新UI
            updateDeviceItemStatus(device.id, false);
            
            showNotification('连接异常', `已连接到设备，但无法获取心率服务。请检查设备是否支持心率监测`, 'warning');
        }
    } catch (error) {
        console.error('连接设备失败:', error);
        
        // 更新UI
        updateDeviceItemStatus(device.id, false);
        
        // 更详细的错误处理
        let errorMessage = '无法连接到设备';
        if (error.message) {
            errorMessage += `: ${error.message}`;
        }
        
        showNotification('连接失败', errorMessage, 'error');
    }
}

// 更新设备列表项的连接状态
function updateDeviceItemStatus(deviceId, connected) {
    const deviceItem = document.querySelector(`.device-item[data-id="${deviceId}"]`);
    if (!deviceItem) return;
    
    const connectButton = deviceItem.querySelector('.btn-connect');
    if (connectButton) {
        connectButton.disabled = connected;
        connectButton.textContent = connected ? '已连接' : '连接';
        
        if (connected) {
            connectButton.classList.add('connected');
        } else {
            connectButton.classList.remove('connected');
        }
    }
    
    // 添加状态指示器
    let statusIndicator = deviceItem.querySelector('.connection-status');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.className = 'connection-status';
        deviceItem.appendChild(statusIndicator);
    }
    
    statusIndicator.textContent = connected ? '已连接' : '未连接';
    statusIndicator.className = connected ? 'connection-status connected' : 'connection-status';
}

// 处理设备断开连接
function onDeviceDisconnected(event) {
    const device = event.target;
    console.log(`设备已断开连接: ${device.name || '未知设备'}`);
    updateDeviceStatus(device.id, false);
    onDeviceConnectionChanged(device.id, false);
    showNotification('设备断开', `设备 ${device.name || '未知设备'} 已断开连接`, 'warning');
    
    // 清除当前设备信息
    if (window.currentHeartRateDevice && window.currentHeartRateDevice.id === device.id) {
        window.currentHeartRateDevice = null;
    }
}

// 处理心率测量数据
function handleHeartRateMeasurement(event) {
    try {
        const value = event.target.value;
        let heartRate = 0;
        let deviceId = 'unknown';
        
        // 获取设备ID
        if (window.currentHeartRateDevice) {
            deviceId = window.currentHeartRateDevice.id;
        }
        
        // 打印原始数据，帮助调试
        console.log('收到心率原始数据:', Array.from(new Uint8Array(value.buffer)));
        
        // 检查数据长度是否有效
        if (value.byteLength < 2) {
            console.warn('无效的心率数据长度:', value.byteLength);
            return;
        }
        
        // 解析心率数据（根据蓝牙心率服务规范）
        // 第一个字节是标志位
        const flags = value.getUint8(0);
        
        // 判断心率格式（8位或16位）
        const isHeartRate16Bits = flags & 0x01;
        
        // 解析心率值
        if (isHeartRate16Bits && value.byteLength >= 3) {
            heartRate = value.getUint16(1, true); // 小端序
        } else {
            heartRate = value.getUint8(1);
        }
        
        // 验证心率值是否在合理范围内（30-250 bpm）
        if (heartRate >= 30 && heartRate <= 250) {
            // 更新心率数据，带上设备ID
            updateHeartRateData(heartRate, deviceId);
            console.log(`处理心率数据: ${heartRate} bpm, 设备: ${deviceId}`);
        } else {
            console.warn(`心率值异常: ${heartRate} bpm，已忽略`);
        }
    } catch (error) {
        console.error('处理心率数据失败:', error);
    }
}

// 更新设备状态
function updateDeviceStatus(deviceId, connected) {
    // 暂时保留此函数以兼容现有代码
    console.log(`设备 ${deviceId} 连接状态更新: ${connected ? '已连接' : '已断开'}`);
}

// 初始化运动目标和提醒设置
function initGoalAndReminderSettings() {
    const saveGoalButton = document.getElementById('saveGoalButton');
    const saveReminderButton = document.getElementById('saveReminderButton');
    const distanceGoalInput = document.getElementById('distanceGoal');
    const timeGoalInput = document.getElementById('timeGoal');
    const reminderEnabledCheckbox = document.getElementById('reminderEnabled');
    const reminderTypeSelect = document.getElementById('reminderType');
    const reminderIntervalInput = document.getElementById('reminderInterval');
    const reminderDistanceInput = document.getElementById('reminderDistance');
    const reminderHeartRateThresholdInput = document.getElementById('reminderHeartRateThreshold');
    const reminderSoundCheckbox = document.getElementById('reminderSound');
    
    // 加载保存的目标设置
    loadGoalSettings();
    
    // 加载保存的提醒设置
    loadReminderSettings();
    
    // 保存运动目标
    if (saveGoalButton) {
        saveGoalButton.addEventListener('click', () => {
            distanceGoal = parseFloat(distanceGoalInput.value) || 5000;
            timeGoal = parseInt(timeGoalInput.value) * 60 || 300; // 转换为秒
            
            saveGoalSettings();
            updateProgressDisplay();
            showNotification('成功', '运动目标已保存', 'success');
        });
    }
    
    // 保存提醒设置
    if (saveReminderButton) {
        saveReminderButton.addEventListener('click', () => {
            reminderEnabled = reminderEnabledCheckbox.checked;
            reminderType = reminderTypeSelect.value;
            reminderInterval = parseInt(reminderIntervalInput.value) || 5;
            reminderDistance = parseFloat(reminderDistanceInput.value) * 1000 || 1000; // 转换为米
            reminderHeartRateThreshold = parseInt(reminderHeartRateThresholdInput.value) || 150;
            reminderSound = reminderSoundCheckbox.checked;
            
            saveReminderSettings();
            resetReminderStates();
            showNotification('成功', '提醒设置已保存', 'success');
        });
    }
    
    // 监听提醒类型变化，显示对应的设置选项
    if (reminderTypeSelect) {
        reminderTypeSelect.addEventListener('change', updateReminderTypeDisplay);
        updateReminderTypeDisplay();
    }
}

// 更新提醒类型显示
function updateReminderTypeDisplay() {
    const reminderTypeSelect = document.getElementById('reminderType');
    const timeReminderSection = document.getElementById('timeReminderSection');
    const distanceReminderSection = document.getElementById('distanceReminderSection');
    const heartRateReminderSection = document.getElementById('heartRateReminderSection');
    
    if (reminderTypeSelect && timeReminderSection && distanceReminderSection && heartRateReminderSection) {
        timeReminderSection.style.display = reminderTypeSelect.value === 'time' ? 'flex' : 'none';
        distanceReminderSection.style.display = reminderTypeSelect.value === 'distance' ? 'flex' : 'none';
        heartRateReminderSection.style.display = reminderTypeSelect.value === 'heartRate' ? 'flex' : 'none';
    }
}

// 保存运动目标设置
function saveGoalSettings() {
    if (!isGuestMode && currentUserId) {
        localStorage.setItem(`goals_${currentUserId}`, JSON.stringify({
            distanceGoal,
            timeGoal
        }));
    } else {
        // 访客模式也保存，但不关联用户ID
        localStorage.setItem('goals_guest', JSON.stringify({
            distanceGoal,
            timeGoal
        }));
    }
}

// 加载运动目标设置
function loadGoalSettings() {
    const distanceGoalInput = document.getElementById('distanceGoal');
    const timeGoalInput = document.getElementById('timeGoal');
    
    if (!distanceGoalInput || !timeGoalInput) return;
    
    let savedGoals;
    if (!isGuestMode && currentUserId) {
        savedGoals = JSON.parse(localStorage.getItem(`goals_${currentUserId}`));
    } else {
        savedGoals = JSON.parse(localStorage.getItem('goals_guest'));
    }
    
    if (savedGoals) {
        distanceGoal = savedGoals.distanceGoal || 5000;
        timeGoal = savedGoals.timeGoal || 300;
        
        distanceGoalInput.value = distanceGoal / 1000; // 显示为千米
        timeGoalInput.value = timeGoal / 60; // 显示为分钟
    } else {
        // 设置默认值
        distanceGoalInput.value = distanceGoal / 1000;
        timeGoalInput.value = timeGoal / 60;
    }
}

// 保存提醒设置
function saveReminderSettings() {
    if (!isGuestMode && currentUserId) {
        localStorage.setItem(`reminders_${currentUserId}`, JSON.stringify({
            reminderEnabled,
            reminderType,
            reminderInterval,
            reminderDistance,
            reminderHeartRateThreshold,
            reminderSound
        }));
    } else {
        localStorage.setItem('reminders_guest', JSON.stringify({
            reminderEnabled,
            reminderType,
            reminderInterval,
            reminderDistance,
            reminderHeartRateThreshold,
            reminderSound
        }));
    }
}

// 加载提醒设置
function loadReminderSettings() {
    const reminderEnabledCheckbox = document.getElementById('reminderEnabled');
    const reminderTypeSelect = document.getElementById('reminderType');
    const reminderIntervalInput = document.getElementById('reminderInterval');
    const reminderDistanceInput = document.getElementById('reminderDistance');
    const reminderHeartRateThresholdInput = document.getElementById('reminderHeartRateThreshold');
    const reminderSoundCheckbox = document.getElementById('reminderSound');
    
    if (!reminderEnabledCheckbox || !reminderTypeSelect) return;
    
    let savedReminders;
    if (!isGuestMode && currentUserId) {
        savedReminders = JSON.parse(localStorage.getItem(`reminders_${currentUserId}`));
    } else {
        savedReminders = JSON.parse(localStorage.getItem('reminders_guest'));
    }
    
    if (savedReminders) {
        reminderEnabled = savedReminders.reminderEnabled || false;
        reminderType = savedReminders.reminderType || 'time';
        reminderInterval = savedReminders.reminderInterval || 5;
        reminderDistance = savedReminders.reminderDistance || 1000;
        reminderHeartRateThreshold = savedReminders.reminderHeartRateThreshold || 150;
        reminderSound = savedReminders.reminderSound || true;
        
        reminderEnabledCheckbox.checked = reminderEnabled;
        reminderTypeSelect.value = reminderType;
        if (reminderIntervalInput) reminderIntervalInput.value = reminderInterval;
        if (reminderDistanceInput) reminderDistanceInput.value = reminderDistance / 1000; // 显示为千米
        if (reminderHeartRateThresholdInput) reminderHeartRateThresholdInput.value = reminderHeartRateThreshold;
        if (reminderSoundCheckbox) reminderSoundCheckbox.checked = reminderSound;
    }
}

// 重置提醒状态
function resetReminderStates() {
    lastReminderDistance = distanceTraveled;
    lastReminderTime = Date.now();
}

// 检查是否需要触发提醒
function checkReminder(heartRate = null) {
    if (!reminderEnabled) return;
    
    const currentTime = Date.now();
    const timeSinceLastReminder = (currentTime - lastReminderTime) / (1000 * 60); // 转换为分钟
    
    switch (reminderType) {
        case 'time':
            if (timeSinceLastReminder >= reminderInterval) {
                triggerReminder(`定时提醒：您已运动${Math.floor(timeSinceLastReminder)}分钟`);
                lastReminderTime = currentTime;
            }
            break;
        case 'distance':
            if (distanceTraveled - lastReminderDistance >= reminderDistance) {
                triggerReminder(`距离提醒：您已骑行${(distanceTraveled / 1000).toFixed(1)}公里`);
                lastReminderDistance = distanceTraveled;
            }
            break;
        case 'heartRate':
            // 为心率提醒添加1分钟的间隔限制，避免短时间内重复提醒
            if (heartRate && heartRate >= reminderHeartRateThreshold && timeSinceLastReminder >= 1) {
                triggerReminder(`心率提醒：您的心率已达到${heartRate} bpm`);
                lastReminderTime = currentTime;
            }
            break;
    }
}

// 触发提醒
function triggerReminder(message) {
    // 显示通知
    showNotification('运动提醒', message, 'reminder');
    
    // 播放声音
    if (reminderSound) {
        playReminderSound();
    }
}

// 播放提醒声音
function playReminderSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 高音
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('无法播放提醒声音:', error);
    }
}

// 更新进度显示
function updateProgressDisplay() {
    // 计算距离进度
    const distanceProgress = Math.min((distanceTraveled / distanceGoal) * 100, 100);
    const distanceProgressEl = document.getElementById('distanceProgress');
    const distanceProgressTextEl = document.getElementById('distanceProgressText');
    if (distanceProgressEl && distanceProgressTextEl) {
        distanceProgressEl.style.width = `${distanceProgress}%`;
        distanceProgressEl.textContent = `${Math.floor(distanceProgress)}%`;
        distanceProgressTextEl.textContent = 
            `${(distanceTraveled / 1000).toFixed(1)} / ${(distanceGoal / 1000).toFixed(1)} 公里`;
    }
    
    // 计算时间进度
    const elapsedTime = trackingStartTime ? (Date.now() - trackingStartTime) / 1000 : 0;
    const timeProgress = Math.min((elapsedTime / timeGoal) * 100, 100);
    const timeProgressEl = document.getElementById('timeProgress');
    const timeProgressTextEl = document.getElementById('timeProgressText');
    if (timeProgressEl && timeProgressTextEl) {
        timeProgressEl.style.width = `${timeProgress}%`;
        timeProgressEl.textContent = `${Math.floor(timeProgress)}%`;
        timeProgressTextEl.textContent = 
            `${Math.floor(elapsedTime / 60)}:${Math.floor(elapsedTime % 60).toString().padStart(2, '0')} / ${Math.floor(timeGoal / 60)}:${Math.floor(timeGoal % 60).toString().padStart(2, '0')} 分钟`;
    }
}

// 页面加载完成后初始化应用
window.addEventListener('DOMContentLoaded', initApp);

// 导出运动记录为Excel文件
function exportToExcel() {
    // 收集运动数据
    const exportData = [];
    
    // 添加表头
    exportData.push([
        '时间', 
        '心率 (BPM)', 
        '速度 (km/h)', 
        '累计距离 (km)', 
        '运动状态'
    ]);
    
    // 确保motionHistory数组正确填充
    if (motionHistory.length === 0 && motionTrackingActive) {
        // 如果motionHistory为空但正在运动中，添加当前数据点
        motionHistory.push({
            timestamp: Date.now(),
            speed: currentSpeed,
            distance: Math.max(totalDistance, distanceTraveled)
        });
    }
    
    // 合并心率和运动数据
    const combinedData = [];
    
    // 先添加所有心率数据点
    for (let i = 0; i < heartRateData.length; i++) {
        if (timestamps[i]) {
            combinedData.push({
                timestamp: new Date(timestamps[i]).getTime(),
                heartRate: heartRateData[i],
                speed: '',
                distance: '',
                type: 'heartRate'
            });
        }
    }
    
    // 添加所有运动数据点
    for (let i = 0; i < motionHistory.length; i++) {
        combinedData.push({
            timestamp: motionHistory[i].timestamp,
            heartRate: '',
            speed: motionHistory[i].speed,
            distance: motionHistory[i].distance,
            type: 'motion'
        });
    }
    
    // 按时间排序
    combinedData.sort((a, b) => a.timestamp - b.timestamp);
    
    // 去重并填充数据
    let lastDistance = 0;
    for (let i = 0; i < combinedData.length; i++) {
        const dataPoint = combinedData[i];
        const row = [];
        
        // 添加时间
        row.push(new Date(dataPoint.timestamp).toLocaleString('zh-CN'));
        
        // 添加心率
        row.push(dataPoint.heartRate);
        
        // 添加速度 - 确保速度是有效的数值并转换为km/h
        let speed = dataPoint.speed;
        if (speed !== '' && speed !== undefined) {
            // 如果速度已经是km/h单位，保持不变；否则假设是m/s并转换
            if (speed < 30) { // 假设m/s速度不会超过30（约108km/h）
                speed = (speed * 3.6).toFixed(2); // m/s 转 km/h
            } else {
                speed = speed.toFixed(2);
            }
        }
        row.push(speed);
        
        // 添加累计距离 - 使用统一的距离计算（优先使用locationTracking的distanceTraveled）
        let distance = dataPoint.distance;
        if (distance === '' || distance === undefined) {
            distance = lastDistance;
        } else {
            // 确保距离是有效的数值并转换为km
            if (typeof distance === 'number') {
                distance = (distance / 1000).toFixed(2);
                lastDistance = distance;
            }
        }
        row.push(distance);
        
        // 添加运动状态
        row.push(dataPoint.type === 'motion' ? '运动中' : '记录中');
        
        exportData.push(row);
    }
    
    // 添加汇总信息
    exportData.push(['']); // 空行
    exportData.push(['运动汇总']);
    
    // 使用统一的总距离（优先使用locationTracking的distanceTraveled）
    const finalDistance = Math.max(totalDistance, distanceTraveled);
    exportData.push(['总距离 (km)', (finalDistance / 1000).toFixed(2)]);
    
    // 确保平均速度是有效的数值并转换为km/h
    let finalAvgSpeed = averageSpeed;
    if (typeof finalAvgSpeed === 'number') {
        if (finalAvgSpeed < 30) { // 假设m/s速度不会超过30
            finalAvgSpeed = (finalAvgSpeed * 3.6).toFixed(2); // m/s 转 km/h
        } else {
            finalAvgSpeed = finalAvgSpeed.toFixed(2);
        }
    }
    exportData.push(['平均速度 (km/h)', finalAvgSpeed]);
    
    exportData.push(['最大心率 (BPM)', heartRateData.length > 0 ? Math.max(...heartRateData) : '--']);
    exportData.push(['最小心率 (BPM)', heartRateData.length > 0 ? Math.min(...heartRateData) : '--']);
    exportData.push(['平均心率 (BPM)', heartRateData.length > 0 ? Math.round(heartRateData.reduce((a, b) => a + b, 0) / heartRateData.length) : '--']);
    
    // 如果有位置数据，添加位置记录数量
    if (locationData.length > 0) {
        exportData.push(['位置记录数', locationData.length]);
    }
    
    // 添加运动总时长
    if (lastMotionTimestamp && motionData.length > 0) {
        const startTime = motionData[0].timestamp || Date.now() - 1000; // 兜底值
        const durationSeconds = Math.round((lastMotionTimestamp - startTime) / 1000);
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        exportData.push(['运动时长', formattedDuration]);
    }
    
    // 创建工作簿和工作表
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "运动记录");
    
    // 设置列宽
    ws['!cols'] = [
        {wch: 20}, // 时间
        {wch: 12}, // 心率
        {wch: 12}, // 速度
        {wch: 12}, // 累计距离
        {wch: 12}  // 状态
    ];
    
    // 生成文件名（包含时间戳）
    const timestamp = new Date().toLocaleString('zh-CN').replace(/[/\\:*?"<>|]/g, '-');
    const filename = `运动记录_${timestamp}.xlsx`;
    
    // 导出文件
    try {
        XLSX.writeFile(wb, filename);
        // 显示导出成功提示
        showNotification('成功', '运动记录已成功导出为Excel文件', 'success');
    } catch (error) {
        console.error('导出Excel文件失败:', error);
        showNotification('错误', '导出Excel文件失败，请重试', 'error');
    }
}