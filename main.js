const { app, BrowserWindow, Menu, ipcMain} = require('electron');
const path = require('path');
const url = require('url');
const express = require('express');
const { updateElectronApp, UpdateSourceType } = require('update-electron-app');
const Store = require('electron-store');


const defaultSchema = {
};

const store = new Store();
if (store.get('config') === undefined) {
    store.set('config', defaultSchema);
}

ipcMain.handle('electron-store-get-data', (event, key) => {
    console.log(`Fetching key: ${key}`);
    const result = store.get(key);
    console.log(`Result fetched from store: ${result}`);
    return result;
});

ipcMain.on('electron-store-set-data', (event, key, value) => {
    store.set(key, value);
});

let pythonProcess;

function createWindow() {
    const loadingWindow = new BrowserWindow({
        width: 300,
        height: 300,
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true
        },
        show: false
    });

    let win = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: true,
        title: 'PlayVision - Control Panel',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // Required for using contextBridge
            nodeIntegration: true, 
            nodeIntegrationInSubFrames: true
        },
        show: false
    });

    loadingWindow.loadURL(url.format({
        pathname: path.join(__dirname, './loadingWindow.html'),
        protocol: 'file:',
        slashes: true
    }), {"extraHeaders" : "pragma: no-cache\n"});


    loadingWindow.once('ready-to-show', () => {
        loadingWindow.show();
    });

    var topPanelHidden = false;
    var bottomPanelHidden = false;

    const template = [{
        label: 'app.name',
        submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        {type: 'separator'},
        {label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: async () => {
            const addressWindow = new BrowserWindow({
                width: 750,
                height: 500,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    nodeIntegration: true
                },
                show: false,
                title: "PlayVision - Overlay Addresses"
            }); 
            addressWindow.loadURL(url.format({
                pathname: path.join(__dirname, './addressWindow.html'),
                protocol: 'file:',
                slashes: true
            }), {"extraHeaders" : "pragma: no-cache\n"});
        
        
            addressWindow.once('ready-to-show', () => {
                addressWindow.show();
            });}},
        {type: 'separator'},
        { role: 'toggleDevTools' },
        ]
    },
    {
        label: 'Pages',
        submenu: [
            {label: 'Show Previews',
                click: async () => {
                    const previewLoading = new BrowserWindow({
                        width: 300,
                        height: 300,
                        frame: false,
                        transparent: true,
                        webPreferences: {
                            nodeIntegration: true
                        },
                        show: false
                    }); 
                    previewLoading.loadURL(url.format({
                        pathname: path.join(__dirname, './loadingWindow.html'),
                        protocol: 'file:',
                        slashes: true
                    }), {"extraHeaders" : "pragma: no-cache\n"});
                
                
                    previewLoading.once('ready-to-show', () => {
                        previewLoading.show();
                    });

                    let previews = new BrowserWindow({
                        width: 1285,
                        height: 755,
                        title: "PlayVision - Overlay Previews",
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: false,
                            enableRemoteModule: true,
                            zoomFactor: 0.234375, // 1200/2560 = 0.46875 to scale down 2560x1440 to 1200x800
                        },
                        show: false
                    });

                    if (previews.isVisible()) {
                        previews.focus();
                        return
                    }
                    // Load the website
                    previews.loadURL(url.format({
                        pathname: path.join(__dirname, './previews.html'),
                        protocol: 'file:',
                        slashes: true
                    }), {"extraHeaders" : "pragma: no-cache\n"});// Replace with your website's URL
                
                    // Optionally, open DevTools for debugging
                    // win.webContents.openDevTools();
                
                    // Ensure the zoomFactor is set after the window is ready
                    previews.webContents.on('did-finish-load', () => {
                        previewLoading.close();
                        previews.show();
                        previews.webContents.setZoomFactor(0.234375); // Set the zoom factor to scale the content down
                    });

                    previews.on('closed', () => {
                        previews = null;
                    });
                }
            },
            {label: 'Show Controllers',
                click: async () => {                    
                    if (win.isVisible()) {
                        win.focus();
                        return
                    }   

                    win.show();
                }
            },
        ]
    },
    {
        label: 'View', 
        submenu: [
            {role: 'toggleFullscreen'},
            {type: 'separator'},
            {label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => {win.webContents.zoomFactor += 0.1}},
            {label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => {win.webContents.zoomFactor -= 0.1}},
            {label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => win.webContents.zoomFactor = 1},
            {type: 'separator'},
            {label: 'OBS Control', accelerator: 'CmdOrCtrl+1', type: 'checkbox', checked: true, click: (menuItem) => {
                const checked = menuItem.checked
                if (checked == false && bottomPanelHidden) {
                    menuItem.checked = true
                    return
                }
                win.webContents.send('toggle-window', "top-panel", checked)
                topPanelHidden = !checked
            }},
            {label: 'Overlay Control', accelerator: 'CmdOrCtrl+2', type: 'checkbox', checked: true, click: (menuItem) => {
                const checked = menuItem.checked
                if (checked == false && topPanelHidden) {
                    menuItem.checked = true
                    return
                }
                win.webContents.send('toggle-window', "bottom-panel", checked)
                bottomPanelHidden = !checked
            }}
        ]
    }]

    win.loadURL(url.format({
        pathname: path.join(__dirname, './mainScreen.html'),
        protocol: 'file:',
        slashes: true
    }), {"extraHeaders" : "pragma: no-cache\n"});

    win.once('ready-to-show', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        loadingWindow.close();
        win.show();
        const menu = Menu.buildFromTemplate(template)
        Menu.setApplicationMenu(menu)
    });

    //When page is reloaded or loaded, set both OBS Control and Overlay Control checkboxes to true in the menu
    win.webContents.on('did-finish-load', () => {
        const menu = Menu.getApplicationMenu()
        menu.items[2].submenu.items[3].checked = true
        menu.items[2].submenu.items[4].checked = true
    });


    win.on('closed', () => {
        win = null;
    });
}

app.whenReady().then(() => {
    const expressApp = express();
    const port = 5500;

    expressApp.use((req, res, next) => {
        if (req.url.startsWith('/.')) {
            res.sendFile(path.join(__dirname, req.url), { dotfiles: 'allow' });
        } else {
            next();
        }
    });

    expressApp.get('/teamScores', (req, res) => {
        res.sendFile(path.join(__dirname, 'Renderer', 'football', 'teamScores', 'main.html'));
    });

    // Serve other files normally
    expressApp.use(express.static(path.join(__dirname)));

    // TODO
    expressApp.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            throw new Error(`Port ${port} is already in use. Please kill the process using this port or change the port in the code.`);
        } else {
            console.error(err);
        }
    });
    createWindow();
})

app.on('window-all-closed', () => {
    app.quit();
});

app.on('before-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Force close the application when quitting
app.on('quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});
