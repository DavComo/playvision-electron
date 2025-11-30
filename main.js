const { app, BrowserWindow, Menu, ipcMain, dialog} = require('electron');
const path = require('path');
const url = require('url');
const express = require('express');
const Store = require('electron-store');
const fs = require('fs');
const { autoUpdater } = require('electron-updater')


const defaultSchema = {
};

var settingsOpened = false;
var addressWindow;

app.setName("PlayVision")

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

// main.js (add below the other imports and app.whenReady)
const userDataPath = app.getPath('userData')

ipcMain.handle('file:save', async (event, filename, data) => {
  try {
    const filePath = path.join(userDataPath, filename)

    // If you want JSON:
    const toWrite = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

    await fs.promises.writeFile(filePath, toWrite, 'utf-8')
    return { ok: true, path: filePath }
  } catch (err) {
    console.error('Save error', err)
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('file:load', async (event, filename) => {
  try {
    const filePath = path.join(userDataPath, filename)
    const content = await fs.promises.readFile(filePath, 'utf-8')

    // If you know it’s JSON, parse it:
    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = content
    }

    return { ok: true, data: parsed }
  } catch (err) {
    console.error('Load error', err)
    return { ok: false, error: err.message }
  }
})

ipcMain.on('valid-license-key', (event, data) => {
    for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('license-key-validified', data);
    }
});

ipcMain.handle("show-alert", async (event, options) => {
    if (settingsOpened) {
        addressWindow.focus()
        return;
    } else {
        settingsOpened = true;
    }
    addressWindow = new BrowserWindow({
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
        addressWindow.setAlwaysOnTop(true)
    });
    addressWindow.on('closed', () => {
        settingsOpened = false;
    });

    return dialog.showMessageBox({
        type: options.type || "info",
        title: options.title || "Alert",
        message: options.message,
        buttons: ["OK"]
    });
});

ipcMain.on('restart', (event, key, value) => {
    app.relaunch()
    app.exit()
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
        label: app.name,
        submenu: [
        { role: 'about'},
        { role: 'reload' },
        { role: 'forceReload' },
        {type: 'separator'},
        {label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: async () => {
            if (settingsOpened) {
                addressWindow.focus()
                return;
            } else {
                settingsOpened = true;
            }
            addressWindow = new BrowserWindow({
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
            });
            addressWindow.on('closed', () => {
                settingsOpened = false;
            });
        }},
        {type: 'separator'},
        {role: 'toggleDevTools'}
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
                        width: 1280,
                        height: 720,
                        minWidth: 1280,
                        useContentSize: true,
                        resizable: true,
                        title: "PlayVision - Overlay Previews",
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                            enableRemoteModule: false
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
    { label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]},
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

const configPath = path.join(app.getPath('userData'), '.streamData.json')

function loadStreamConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Could not read stream config:', e)
    return {}
  }
}

function setupAutoUpdater() {
  autoUpdater.logger = require('electron-log')
  autoUpdater.logger.transports.file.level = 'info'

  autoUpdater.autoDownload = true

  autoUpdater.on('update-not-available', () => {
    console.log('No update available.')
  })

  autoUpdater.on('error', err => {
    console.error('Error in auto-updater:', err)
  })

  autoUpdater.on('download-progress', progressObj => {
    console.log(`Downloaded ${Math.round(progressObj.percent)}%`)
  })

  autoUpdater.on('update-downloaded', info => {
    console.log('Update downloaded:', info.version)

    const result = dialog.showMessageBoxSync({
      type: 'question',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: 'A new version has been downloaded. Restart to apply it?'
    })

    if (result === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.checkForUpdates()
}


app.whenReady().then(() => {
    const expressApp = express();
    const port = 5500;

    setupAutoUpdater()

    app.setAboutPanelOptions({
        applicationName: app.name,
        applicationVersion: app.getVersion(),
        version: app.getVersion(),
        copyright: '© 2025 David Comor',
        credits: 'Built with Electron and lots of sleepless nights 💤'
    })

    expressApp.use((req, res, next) => {
        if (req.url.startsWith('/.')) {
            res.sendFile(path.join(__dirname, req.url), { dotfiles: 'allow' });
        } else {
            next();
        }
    });
    
    expressApp.get('/stream-config', (req, res) => {
        const config = loadStreamConfig()
        res.json(config)
    })



    expressApp.get('/teamScores', (req, res) => {
        res.sendFile(path.join(__dirname, 'Renderer', 'football', 'teamScores', 'main.html'));
    });

    expressApp.use(express.static(path.join(__dirname)));

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

    fs.unlink('./.streamData.js', (err) => {
    if (err) {
        console.error('Failed to delete file:', err);
        return;
    }
    console.log('File deleted successfully');
    });
});
