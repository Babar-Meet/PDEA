# YT Local Desktop - Installation and Setup Guide

![YT Local Desktop](https://via.placeholder.com/800x400?text=YT+Local+Desktop)

## 🚀 Quick Start - For Beginners

If you have **no prior technical knowledge**, follow these simple steps:

### Step 1: Prerequisites

You need to have **Node.js** installed on your computer. If you don't have it:

1. Go to [Node.js Download Page](https://nodejs.org/)
2. Download the **LTS (Long Term Support)** version (recommended for most users)
3. Run the downloaded installer
4. Click "Next" through all the screens
5. Finish the installation

### Step 2: Installation

1. Extract the project files to a folder on your computer
2. Find the `install.bat` file (in the main project folder)
3. Double-click on `install.bat` to run it
4. A black window will open - don't close it!
5. The installation will take a few minutes (be patient)
6. When you see "Installation complete!", press any key to close the window

### Step 3: Run the Application

You have two options to run the application:

#### Option A: Desktop Application (Recommended)

1. Find the `run-electron.bat` file
2. Double-click on `run-electron.bat` to run it
3. The application will start in a new window
4. You can use it like any other desktop app

#### Option B: Browser Version

1. Find the `run-browser.bat` file
2. Double-click on `run-browser.bat` to run it
3. A browser window will automatically open
4. If not, visit http://localhost:5000

**Note**: If you see permission errors, try right-clicking the .bat file and selecting "Run as administrator".

## 📖 Detailed Instructions

### Installation Script - install.bat

This script automatically:
1. Checks if Node.js is installed
2. Installs root dependencies (Electron)
3. Installs backend dependencies
4. Installs frontend dependencies

You only need to run this **once**.

### Desktop Application - run-electron.bat

This script:
1. Checks dependencies are installed
2. Ensures frontend is built
3. Starts the Electron desktop application

Features:
- Native desktop experience
- Better performance
- Full screen support
- Background downloads

### Browser Version - run-browser.bat

This script:
1. Builds the frontend (if needed)
2. Starts the backend server
3. Opens the application in your default browser

Features:
- Works on any modern browser
- Easy sharing between devices
- No installation required once dependencies are set up

## ❓ Troubleshooting

### Common Issues

**1. "Node.js is not installed" error**
- Download and install Node.js from https://nodejs.org/
- Restart your computer after installation

**2. Permission errors**
- Always run batch files as administrator
- Right-click → "Run as administrator"

**3. Installation takes too long**
- Check your internet connection
- The first installation may take 5-10 minutes
- Subsequent runs are much faster

**4. Port 5000 is already in use**
- Close any other applications using port 5000
- Or restart your computer

### Manual Installation (Advanced Users)

If the batch files don't work for you, you can install manually:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Manual Startup

```bash
# Run desktop application
npm start

# Or run browser version
cd backend
node server.js
# Open browser to http://localhost:5000
```

## 📁 Project Structure

```
YT Local Desktop/
├── install.bat            # Installation script
├── run-electron.bat       # Run desktop app
├── run-browser.bat        # Run browser version
├── package.json           # Root dependencies
├── main.js                # Electron entry point
├── backend/               # Backend server
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── services/          # Business logic
└── frontend/              # React frontend
    ├── package.json       # Frontend dependencies
    ├── src/               # Source code
    └── dist/              # Build output
```

## 🎯 Features

### Video Download
- Multiple quality options (360p to 4K)
- Audio language selection
- Playlist downloads
- Batch processing
- Pause/resume support

### Video Player
- Full-featured video player
- Thumbnail generation
- Video categories
- Search functionality

### Subscriptions
- YouTube channel subscriptions
- Auto-download new videos
- Video queue management

### Ambience
- Ambience video collection
- Ambience playback settings

## 🔧 System Requirements

- **Windows 10/11** (recommended)
- **Node.js 16+** (LTS version)
- **1 GB RAM** (minimum)
- **500 MB disk space** for application files
- **Additional space for downloaded videos**

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Restart the application
3. Re-run the installation script
4. Ensure you're running the batch files as administrator

## 📝 License

This project is open source and available for personal use.

---

**Thank you for using YT Local Desktop! 🎉**
