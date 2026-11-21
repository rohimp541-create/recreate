@echo off
title RE:CREATE Server & Database
chcp 65001 >nul
echo.
echo ========================================================
echo   RE:CREATE - خادم التطبيق وقاعدة البيانات الحية
echo   شعارنا: "متترميش القديم.. اصنع منه حاجة جديدة!"
echo ========================================================
echo.
echo جاري تشغيل السيرفر المحلي وقاعدة البيانات...
if exist "%ProgramFiles%\nodejs\node.exe" (
    "%ProgramFiles%\nodejs\node.exe" server.js
) else (
    node.exe server.js
)
if errorlevel 1 (
    echo.
    echo [تنبيه] Node.js غير متوفر في المسار، جاري المحاولة باستخدام Python...
    python -m http.server 3000
)
pause
