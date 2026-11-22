@echo off
chcp 65001 > nul
cd /d "%~dp0"
title AllDesk 자동 배포기

echo ========================================================
echo   ⚡ AllDesk 넷리파이(Netlify) 원클릭 자동 배포
echo ========================================================
echo.
echo [1/2] 최신 버전 빌드 중 (npm run build)...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ 빌드 실패! 오류를 확인하세요.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Netlify 클라우드로 자동 배포 중...
call npx.cmd netlify-cli deploy --prod --dir=dist

echo.
echo ========================================================
echo   🎉 자동 배포가 완료되었습니다!
echo ========================================================
pause
