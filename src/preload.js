const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  launchGame: (gameInfo) => ipcRenderer.invoke('launch-game', gameInfo),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getAppPaths: () => ipcRenderer.invoke('get-app-paths'),
  downloadGameToLibrary: (downloadInfo) => ipcRenderer.invoke('download-game-to-library', downloadInfo),
  checkGameInstalled: (fileName) => ipcRenderer.invoke('check-game-installed', fileName),
  uninstallGame: (fileName) => ipcRenderer.invoke('uninstall-game', fileName),
  openLibraryFolder: () => ipcRenderer.invoke('open-library-folder'),
  
  // Progress events
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  removeDownloadProgressListener: (callback) => {
    ipcRenderer.removeListener('download-progress', callback);
  }
});
