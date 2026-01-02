@echo off
REM Windows batch script for building 5eMobile module
echo Building 5eMobile module...
node build.js
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b %ERRORLEVEL%
)
echo Build complete!
pause

