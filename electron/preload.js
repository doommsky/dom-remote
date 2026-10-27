const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  saveFile: (options) => ipcRenderer.invoke('show-save-dialog', options),
  openFile: (options) => ipcRenderer.invoke('show-open-dialog', options),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (_, action) => callback(action)),
});