# PDEA

A YouTube video downloader and player desktop application built with Electron, React, and Node.js.

## 🚀 Quick Start

### For Windows Users

1. **Download and Extract**: Download the project and extract the files to a folder on your computer
2. **Install Dependencies**: Double-click `install.bat`
3. **Run the Application**:
   - **Desktop App**: Double-click `run-electron.bat`
   - **Browser Version**: Double-click `run-browser.bat`

**Note**: If you see permission errors, try right-clicking the .bat file and selecting "Run as administrator".

## 📁 Project Structure

```
YT Local Desktop/
├── install.bat            # Installation script
├── run-electron.bat       # Run desktop app
├── run-browser.bat        # Run browser version
├── README.md              # Project documentation
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
- **Multiple Quality Options**: Download videos in 360p, 480p, 720p, 1080p, 1440p, or 2160p (4K)
- **Audio Language Selection**: Choose from available audio languages
- **Playlist Downloads**: Download entire playlists
- **Batch Processing**: Queue multiple videos for download
- **Pause/Resume**: Resume downloads after pausing
- **Download History**: Track all downloaded videos

### Video Player
- **Full-Featured Player**: Advanced controls with play, pause, seek, volume
- **Thumbnail Generation**: Auto-generates thumbnails for all videos
- **Video Categories**: Organize videos into categories
- **Search Functionality**: Search through your video library
- **Playback Speed**: Adjust playback speed from 0.5x to 2x

### Subscriptions
- **YouTube Channel Subscriptions**: Subscribe to YouTube channels
- **Auto-Download**: Automatically download new videos from subscriptions
- **Video Queue**: Manage pending videos for download
- **Notification System**: Get notified when new videos are available

### Ambience
- **Ambience Video Collection**: Curated collection of ambient videos
- **Ambience Playback**: Special mode for background ambience videos
- **Sync Functionality**: Sync ambience across devices

## 📖 Detailed Installation Guide

### Prerequisites
- **Windows 10/11** (Windows 7 may work but is not recommended)
- **Node.js 16.0 or later** (LTS version recommended)
- **At least 1GB RAM** (2GB recommended)
- **At least 500MB free disk space** for the application
- **Additional space for downloaded videos**

### Step-by-Step Installation

1. **Install Node.js**:
   - Go to [Node.js Download Page](https://nodejs.org/)
   - Download the **LTS (Long Term Support)** version
   - Run the installer and follow the instructions
   - Restart your computer after installation

2. **Extract the Project**:
   - Extract the downloaded ZIP file to a folder on your computer
   - Choose a location with plenty of free space for videos

3. **Install Dependencies**:
   - Double-click `install.bat` to start the installation
   - A black window will open - don't close it!
   - The installation will take 5-10 minutes (be patient)
   - When you see "Installation complete!", press any key to close

4. **Run the Application**:
   - **Desktop App**: Double-click `run-electron.bat`
   - **Browser Version**: Double-click `run-browser.bat`

### Manual Installation (For Developers)

```bash
# Install root dependencies (Electron)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Build the frontend
cd frontend
npm run build
cd ..

# Run the application
npm start
```

## 🎮 Usage

### Desktop Application

1. **Main Window**: Shows your video library in a grid format
2. **Navigation**: Use the sidebar to browse categories and playlists
3. **Video Player**: Click any video to open it in the player
4. **Download**: Click the download button in the top navigation
5. **Settings**: Click the settings icon for application preferences

### Browser Version

1. The application will open automatically in your default browser
2. If not, visit http://localhost:5000
3. Features are identical to the desktop version

## ❓ Troubleshooting

### Common Issues

**1. Node.js is not installed**
- Download and install Node.js from https://nodejs.org/
- Restart your computer after installation

**2. Permission errors**
- Right-click the .bat file and select "Run as administrator"
- If UAC asks for permission, click "Yes"

**3. Installation takes too long**
- The first installation takes 5-10 minutes
- Check your internet connection
- Be patient

**4. Port 5000 is already in use**
- Close any other applications using port 5000
- Try restarting your computer

**5. Videos won't download**
- Check your internet connection
- Ensure yt-dlp is working (should be in `backend/public/yt-dlp.exe`)
- Try using a different video URL

### Reinstalling the Application

If all else fails:
1. Delete the `node_modules` folders in root, backend, and frontend
2. Delete the `frontend/dist` folder
3. Re-run `install.bat`

## 🔧 System Requirements

- **Operating System**: Windows 10/11 (64-bit)
- **Processor**: Intel i3 or equivalent
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 500MB for application, additional space for videos
- **Internet**: Required for downloading videos and updates

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Re-run the installation script
3. Ensure you're running the batch files as administrator

## 📝 License

This project is open source and available for personal use.

## 🐛 Reporting Issues

If you find a bug or have a feature request:
1. Check if the issue already exists in the project's bug tracker
2. Create a new issue with detailed information about the problem
3. Include steps to reproduce the issue
4. Include any error messages or screenshots

---

**Thank you for using YT Local Desktop! 🎉**
