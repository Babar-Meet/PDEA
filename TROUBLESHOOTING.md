# Troubleshooting Guide

## Common Issues and Solutions

### 1. Node.js is not installed

**Problem**: `install.bat` fails with "Node.js is not installed!"

**Solution**:
1. Visit https://nodejs.org/
2. Download the **LTS (Long Term Support)** version
3. Run the installer
4. Click "Next" through all screens
5. Restart your computer
6. Re-run `install.bat`

### 2. Permission denied or access errors

**Problem**: Batch files fail with permission errors

**Solution**:
1. Right-click the .bat file
2. Select "Run as administrator"
3. If UAC (User Account Control) asks for permission, click "Yes"

### 3. Installation takes too long

**Problem**: The installation seems to hang or take forever

**Solution**:
- The first installation takes longer (5-10 minutes)
- Check your internet connection
- Be patient - it will complete

### 4. Port 5000 is already in use

**Problem**: Browser version fails to start because port 5000 is in use

**Solution**:
1. Close any other applications that might be using port 5000
2. Try restarting your computer
3. Or, manually change the port in `backend/server.js` (line 18)

### 5. Dependencies not found

**Problem**: Scripts fail because dependencies are not installed

**Solution**:
1. Re-run `install.bat` (run as administrator)
2. Wait for the installation to complete

### 6. Frontend not built

**Problem**: Desktop app fails to start because frontend not built

**Solution**:
1. The `run-electron.bat` script should build it automatically
2. If not, manually build it:
   - Open Command Prompt
   - Navigate to the frontend folder: `cd frontend`
   - Run: `npm run build`

### 7. Electron application won't open

**Problem**: Desktop app fails to start

**Solution**:
1. Check if Node.js is properly installed: `node --version`
2. Re-run `install.bat`
3. Check if there are any error messages in the console

### 8. Videos won't download

**Problem**: Downloads fail or don't start

**Solution**:
1. Check your internet connection
2. Ensure yt-dlp is working (should be in `backend/public/yt-dlp.exe`)
3. Try using a different video URL
4. Check if there's any antivirus or firewall blocking the application

### 9. Thumbnails not showing

**Problem**: Video thumbnails are missing

**Solution**:
1. The application will automatically generate thumbnails
2. If they're not showing, try re-scanning your videos
3. Check the `backend/public/thumbnails` folder

### 10. Subscriptions not updating

**Problem**: New videos from subscriptions not appearing

**Solution**:
1. Check your internet connection
2. Try re-adding the subscription
3. Check the subscription service status in the application

## Manual Installation Steps

If the batch files don't work, try installing manually:

1. Open Command Prompt as administrator
2. Navigate to the project folder
3. Run the following commands:

```cmd
:: Install root dependencies (Electron)
npm install

:: Install backend dependencies
cd backend
npm install
cd ..

:: Install frontend dependencies
cd frontend
npm install
npm run build
cd ..

:: Run the application
npm start
```

## Checking Logs

### Backend Server Logs
When running the browser version, the backend server logs are visible in the new command prompt window.

### Desktop App DevTools
1. Press `Ctrl+Shift+I` in the desktop app
2. Go to the "Console" tab to see errors

## System Requirements

- **Windows 10/11** (Windows 7 may work but is not recommended)
- **Node.js 16.0 or later** (LTS version recommended)
- **At least 1GB RAM** (2GB recommended)
- **At least 500MB free disk space** for the application
- **Additional space for downloaded videos**

## Reinstalling the Application

If all else fails:
1. Delete the `node_modules` folders in:
   - Root directory
   - Backend directory
   - Frontend directory
2. Delete the `frontend/dist` folder
3. Re-run `install.bat`

## Contact Support

If you're still having issues:
1. Check the GitHub issues page
2. Look for similar problems in the project's discussions
3. Create a new issue with details about your problem

---

**Remember**: Always run the application as administrator!
