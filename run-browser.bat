@echo off
echo ==============================================
echo PDEA - Browser Version
echo ==============================================
echo.

echo [1/3] Checking if dependencies are installed...
if not exist "node_modules" (
    echo Dependencies not found! Please run install.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "backend/node_modules" (
    echo Dependencies not found! Please run install.bat first.
    echo.
    pause
    exit /b 1
)

if not exist "frontend/node_modules" (
    echo Dependencies not found! Please run install.bat first.
    echo.
    pause
    exit /b 1
)
echo.

echo [2/3] Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build frontend!
    echo.
    pause
    cd ..
    exit /b 1
)
cd ..
echo.

echo [3/3] Starting backend server...
cd backend
start "Backend Server" cmd /k "node server.js"
echo Backend server started in new window...
cd ..
echo.

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo ==============================================
echo Application is starting...
echo ==============================================
echo.
echo Backend server: http://localhost:5000
echo Frontend (after build): http://localhost:5000
echo.
echo If the browser doesn't open automatically, please visit:
echo http://localhost:5000
echo.

echo Opening browser...
start http://localhost:5000

echo.
echo Press any key to exit (backend will continue running)...
echo Note: If you experience permission errors, try right-clicking and selecting "Run as administrator"
echo.
pause >nul
