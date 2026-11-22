@echo off
chcp 65001 > nul
cd /d "%~dp0"
title AllDesk 올인원 데스크 실행기
echo ========================================================
echo   ⚡ AllDesk 올인원 데스크를 시작합니다...
echo ========================================================
echo.
echo [1/2] 로컬 서버를 구동 중입니다 (http://localhost:3000)
echo [2/2] 기본 웹 브라우저를 자동으로 엽니다...
echo.

start "" http://localhost:3000
npm.cmd run dev
pause
