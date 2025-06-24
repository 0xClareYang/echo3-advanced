@echo off
echo 🛑 停止 ECHO3 系统...

REM 停止所有Node.js进程
echo 清理 Node.js 进程...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1

REM 清理日志文件
if exist "agent.log" del "agent.log"
if exist "frontend.log" del "frontend.log"

echo ✅ ECHO3 系统已停止！
pause 
