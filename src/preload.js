const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath),
});
