@echo off
chcp 65001 > nul
cd /d "%~dp0"
title OmniTool 생산성 스위트 실행기
echo ========================================================
echo   ⚡ OmniTool 올인원 생산성 스위트를 시작합니다...
echo ========================================================
echo.
echo [1/2] 로컬 서버를 구동 중입니다 (http://localhost:3000)
echo [2/2] 기본 웹 브라우저를 자동으로 엽니다...
echo.

start "" http://localhost:3000
npm.cmd run dev
pause
