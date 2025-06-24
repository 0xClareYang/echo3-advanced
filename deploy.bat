@echo off
echo 🚀 ECHO3 Chainlink Hackathon 部署开始...

REM 检查Node.js版本
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM 检查环境文件
if not exist ".env" (
    echo ❌ .env 文件不存在，请先创建 .env 文件
    echo 📋 参考模板：
    echo SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
    echo PRIVATE_KEY=your_private_key
    pause
    exit /b 1
)

REM 安装依赖
echo 📦 安装项目依赖...
call npm install
if errorlevel 1 (
    echo ❌ 主项目依赖安装失败
    pause
    exit /b 1
)

echo 📦 安装 Agent 依赖...
cd agent
call npm install
if errorlevel 1 (
    echo ❌ Agent 依赖安装失败
    pause
    exit /b 1
)
cd ..

echo 📦 安装 Frontend 依赖...
cd frontend
call npm install
if errorlevel 1 (
    echo ❌ Frontend 依赖安装失败
    pause
    exit /b 1
)
cd ..

REM 编译智能合约
echo 🔨 编译智能合约...
call npx hardhat compile
if errorlevel 1 (
    echo ❌ 合约编译失败
    pause
    exit /b 1
)

REM 部署到Sepolia测试网
echo 🚀 部署智能合约到 Sepolia 测试网...
call npx hardhat run scripts/deploy-enhanced.js --network sepolia
if errorlevel 1 (
    echo ❌ 合约部署失败
    echo 💡 请检查：
    echo    1. .env 文件中的 SEPOLIA_RPC_URL 和 PRIVATE_KEY
    echo    2. 钱包是否有足够的 Sepolia ETH
    echo    3. 获取测试币：https://sepoliafaucet.com/
    pause
    exit /b 1
)

echo ✅ 智能合约部署成功！

REM 启动后端服务
echo 🔧 启动 Agent 后端...
cd agent
start /b cmd /c "npm start > ../agent.log 2>&1"
cd ..

REM 等待后端启动
echo ⏳ 等待后端启动...
timeout /t 8 /nobreak > nul

REM 检查后端是否启动成功
curl -f http://localhost:3001/api/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Agent 后端启动失败，检查日志：agent.log
    pause
    exit /b 1
) else (
    echo ✅ Agent 后端启动成功
)

REM 启动前端
echo 🌐 启动前端应用...
cd frontend
start /b cmd /c "npm start > ../frontend.log 2>&1"
cd ..

echo 🎉 ECHO3 部署完成！
echo.
echo 📊 服务状态：
echo    🌐 前端：http://localhost:3000
echo    🔌 后端：http://localhost:3001
echo    📊 健康检查：http://localhost:3001/api/health
echo.
echo 🔗 Chainlink 集成验证：
echo    ✅ 智能合约已部署并集成 5 种 Chainlink 服务
echo    ✅ VRF (随机数生成)
echo    ✅ Price Feeds (价格数据)
echo    ✅ Automation (自动化)
echo    ✅ Functions (链下计算)
echo    ✅ CCIP (跨链通信)
echo.
echo 🛑 停止服务：stop.bat
echo.
echo 🌐 正在自动打开前端页面...
timeout /t 3 /nobreak > nul
start http://localhost:3000

pause 
