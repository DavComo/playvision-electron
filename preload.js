const { contextBridge, ipcRenderer } = require('electron');
const OBSWebSocket = require('obs-websocket-js').default;

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

const obs = new OBSWebSocket;
contextBridge.exposeInMainWorld('obs', {
    connect: (url) => obs.connect(url),
    on: (event, callback) => obs.on(event, callback),
    disconnect: () => obs.disconnect(),
    send: (requestType, args) => obs.send(requestType, args),
    getSocket: () => obs,
    call: (requestType, args) => obs.call(requestType, args)
});