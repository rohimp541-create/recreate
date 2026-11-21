@echo off
title RE:CREATE - Online Cloud Server & Public Domain
chcp 65001 >nul
echo.
echo ========================================================
echo   RE:CREATE - سيرفر التطبيق مع رابط دومين عالمي سحابي
echo   شعارنا: "متترميش القديم.. اصنع منه حاجة جديدة!"
echo ========================================================
echo.
echo [1/2] جاري تشغيل خادم التطبيق وقاعدة البيانات...
start "RE:CREATE Local Server" /min cmd /c "node.exe server.js"
timeout /t 2 /nobreak >nul
echo [2/2] جاري إنشاء رابط الدومين العالمي عبر شبكة Cloudflare السحابية...
echo ستظهر لك رسالة تحتوي على الرابط المباشر (https://xxxx.trycloudflare.com)
echo.
if exist "%TEMP%\cloudflared.exe" (
    "%TEMP%\cloudflared.exe" tunnel --url http://localhost:3000
) else (
    echo جاري تجهيز الأداة السحابية...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '$env:TEMP\cloudflared.exe'"
    "%TEMP%\cloudflared.exe" tunnel --url http://localhost:3000
)
pause
