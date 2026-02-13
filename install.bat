@echo off
echo ==============================================
echo YT Local Desktop - Installation Script
echo ==============================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js is installed successfully!
echo.

echo [2/4] Installing root dependencies (Electron)...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install root dependencies!
    echo.
    pause
    exit /b 1
)
echo.

echo [3/4] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies!
    echo.
    pause
    cd ..
    exit /b 1
)
cd ..
echo.

echo [4/4] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies!
    echo.
    pause
    cd ..
    exit /b 1
)
cd ..
echo.

echo ==============================================
echo Installation complete!
echo ==============================================
echo.
echo To run the application:
echo   - For Desktop App: Double-click run-electron.bat
echo   - For Browser App: Double-click run-browser.bat
echo.
echo Note: If you experience permission errors, try right-clicking and selecting "Run as administrator"
echo.
pause
