@echo off
echo ==============================================
echo PDEA - Desktop Application
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

echo [2/3] Checking if frontend is built...
if not exist "frontend/dist" (
    echo Frontend build not found! Building now...
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
)
echo.

echo [3/3] Starting Electron application...
call npm start
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Electron application!
    echo.
    pause
    exit /b 1
)

echo.
echo Note: If you experience permission errors, try right-clicking and selecting "Run as administrator"
echo.
pause
