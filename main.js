const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');

const isDev = !app.isPackaged;

// Get app directories
function getAppPaths() {
  const userDataPath = app.getPath('userData');
  const libraryPath = path.join(userDataPath, 'My Library Games');
  
  // Create library directory if it doesn't exist
  if (!fs.existsSync(libraryPath)) {
    fs.mkdirSync(libraryPath, { recursive: true });
    console.log('Created library directory:', libraryPath);
  }
  
  return {
    userData: userDataPath,
    library: libraryPath
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

ipcMain.handle('launch-game', async (_evt, gameInfo) => {
  try {
    let gamePath;
    
    // If gameInfo is a string, it's the old format (direct path)
    if (typeof gameInfo === 'string') {
      gamePath = gameInfo;
    } else {
      // New format: check if game is installed in library
      const paths = getAppPaths();
      const libraryPath = path.join(paths.library, gameInfo.fileName);
      
      if (fs.existsSync(libraryPath)) {
        gamePath = libraryPath;
      } else {
        return { success: false, error: 'Game not installed. Please install the game first.' };
      }
    }

    // Check if file exists
    if (!fs.existsSync(gamePath)) {
      console.error('Game file not found:', gamePath);
      return { success: false, error: 'Game file not found' };
    }

    const fileExtension = path.extname(gamePath).toLowerCase();
    
    switch (fileExtension) {
      case '.nsp':
        // For .NSP files, open the library folder to show all games
        // User can then use their preferred Nintendo Switch emulator
        shell.showItemInFolder(gamePath);
        console.log('NSP file location opened:', gamePath);
        return { success: true, message: 'NSP file ready - Use your Nintendo Switch emulator to load this file' };
        
      case '.docx':
        // For testing purposes, open .docx files with the default application
        shell.openPath(gamePath);
        console.log('DOCX file opened:', gamePath);
        return { success: true, message: 'DOCX file opened' };
        
      case '.zip':
        // For .ZIP files, open the file location so user can extract manually
        shell.showItemInFolder(gamePath);
        console.log('ZIP file location opened:', gamePath);
        return { success: true, message: 'ZIP file location opened - Extract and install the game files' };
        
      case '.exe':
        // For executable files, run them directly
        exec(`"${gamePath}"`, (error) => {
          if (error) {
            console.error('Launch failed:', error);
            return { success: false, error: error.message };
          }
        });
        return { success: true, message: 'Game launched' };
        
      default:
        // For other file types, try to open with default application
        shell.openPath(gamePath);
        console.log('File opened with default application:', gamePath);
        return { success: true, message: 'File opened' };
    }
  } catch (error) {
    console.error('Launch error:', error);
    return { success: false, error: error.message };
  }
});

// Add handler to get user data path for downloads
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// Add handler to get app paths
ipcMain.handle('get-app-paths', () => {
  return getAppPaths();
});

// Add handler to download game to library
ipcMain.handle('download-game-to-library', async (event, { gameId, fileName, token }) => {
  try {
    const paths = getAppPaths();
    const filePath = path.join(paths.library, fileName);
    
    console.log('Starting download to:', filePath);
    console.log('Download URL:', `/api/uploads/download-game/${gameId}`);
    console.log('Token provided:', !!token);
    
    // Create download stream
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/uploads/download-game/${gameId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      console.log('Making request with options:', options);

      const req = http.request(options, (res) => {
        console.log('Response status:', res.statusCode);
        console.log('Response headers:', res.headers);
        
        if (res.statusCode !== 200) {
          const errorMsg = `HTTP ${res.statusCode}: ${res.statusMessage}`;
          console.error('Download failed:', errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        const fileStream = fs.createWriteStream(filePath);
        let downloadedBytes = 0;
        const totalBytes = parseInt(res.headers['content-length'] || '0');

        console.log('Expected file size:', totalBytes, 'bytes');

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
          
          // Send progress update to renderer
          event.sender.send('download-progress', {
            gameId,
            progress: Math.round(progress),
            downloadedBytes,
            totalBytes
          });
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          console.log('Download completed:', filePath);
          console.log('Final file size:', downloadedBytes, 'bytes');
          resolve({ 
            success: true, 
            filePath,
            message: 'Game downloaded successfully' 
          });
        });

        fileStream.on('error', (error) => {
          console.error('File write error:', error);
          reject(error);
        });
      });

      req.on('error', (error) => {
        console.error('Request error:', error);
        reject(error);
      });

      req.setTimeout(30000, () => {
        console.error('Request timeout');
        reject(new Error('Download timeout'));
      });

      req.end();
    });
  } catch (error) {
    console.error('Download setup error:', error);
    return { success: false, error: error.message };
  }
});

// Add handler to check if game is installed in library
ipcMain.handle('check-game-installed', async (event, fileName) => {
  try {
    const paths = getAppPaths();
    const filePath = path.join(paths.library, fileName);
    const isInstalled = fs.existsSync(filePath);
    
    if (isInstalled) {
      const stats = fs.statSync(filePath);
      return {
        installed: true,
        filePath,
        fileSize: stats.size,
        installDate: stats.birthtime
      };
    }
    
    return { installed: false };
  } catch (error) {
    console.error('Check installation error:', error);
    return { installed: false, error: error.message };
  }
});

// Add handler to uninstall game (delete from library)
ipcMain.handle('uninstall-game', async (event, fileName) => {
  try {
    const paths = getAppPaths();
    const filePath = path.join(paths.library, fileName);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Game uninstalled:', filePath);
      return { success: true, message: 'Game uninstalled successfully' };
    } else {
      return { success: false, error: 'Game file not found' };
    }
  } catch (error) {
    console.error('Uninstall error:', error);
    return { success: false, error: error.message };
  }
});

// Add handler to open library folder
ipcMain.handle('open-library-folder', async () => {
  try {
    const paths = getAppPaths();
    shell.openPath(paths.library);
    console.log('Library folder opened:', paths.library);
    return { success: true, message: 'Library folder opened' };
  } catch (error) {
    console.error('Open library folder error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
