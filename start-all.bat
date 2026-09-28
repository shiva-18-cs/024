@echo off
echo ========================================================
echo   Starting CoalGuard Full-Stack Platform
echo   Ministry of Coal / Coal India Limited
echo ========================================================
start "CoalGuard Backend" cmd /k "%~dp0start-backend.bat"
timeout /t 3 /nobreak >nul
start "CoalGuard Frontend" cmd /k "%~dp0start-frontend.bat"
echo.
echo CoalGuard backend running at:  http://localhost:8000 (Docs: http://localhost:8000/docs)
echo CoalGuard frontend running at: http://localhost:5173
echo.
