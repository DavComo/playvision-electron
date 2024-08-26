const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    toggleWindow: (panelId, checked) => ipcRenderer.send('toggle-window', panelId, checked),
    onToggleWindow: (callback) => ipcRenderer.on('toggle-window', (event, panelId, checked) => callback(panelId, checked))
});

contextBridge.exposeInMainWorld('myStore', {
    get: async (key) => {
        console.log(`Requesting key: ${key}`);
        const value = await ipcRenderer.invoke('electron-store-get-data', key);
        console.log(`Value returned from ipcRenderer.invoke: ${value}`);
        return value;
    },
    set: (key, value) => {
        console.log(`Setting key: ${key} with value: ${value}`);
        ipcRenderer.send('electron-store-set-data', key, value);
    }
});
