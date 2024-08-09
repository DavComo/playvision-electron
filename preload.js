const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    toggleWindow: (panelId, checked) => ipcRenderer.send('toggle-window', panelId, checked),
    onToggleWindow: (callback) => ipcRenderer.on('toggle-window', (event, panelId, checked) => callback(panelId, checked))
});
