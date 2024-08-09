const { app, BrowserWindow, Menu, ipcMain} = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const url = require('url');

let pythonProcess;

function createWindow() {
    const loadingWindow = new BrowserWindow({
        width: 300,
        height: 300,
        frame: false,
        webPreferences: {
            nodeIntegration: true
        },
        show: false
    });

    const previews = new BrowserWindow({
        width: 1285,
        height: 755,
        title: "PlaVision - Overlay Previews",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            enableRemoteModule: true,
            zoomFactor: 0.234375, // 1200/2560 = 0.46875 to scale down 2560x1440 to 1200x800
        },
        show: false
    });

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true,
        title: 'Control Panel',
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
        { role: 'toggleDevTools' },
        ]
    },
    {
        label: 'Pages',
        submenu: [
            {label: 'Show Previews',
                click: async () => {
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
                        previews.show();
                        previews.webContents.setZoomFactor(0.234375); // Set the zoom factor to scale the content down
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
            {label: 'Unset'}
        ]
    },
    {
        label: 'View', 
        submenu: [
            {role: 'toggleFullscreen'},
            {label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => {win.webContents.zoomFactor += 0.1}},
            {label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => {win.webContents.zoomFactor -= 0.1}},
            {type: 'separator'},
            {label: 'OBS Control', type: 'checkbox', checked: true, click: (menuItem) => {
                const checked = menuItem.checked
                if (checked == false && bottomPanelHidden) {
                    menuItem.checked = true
                    return
                }
                win.webContents.send('toggle-window', "top-panel", checked)
                topPanelHidden = !checked
            }},
            {label: 'Overlay Control', type: 'checkbox', checked: true, click: (menuItem) => {
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


    const executablePath = path.join(__dirname, process.platform === 'win32' ? 'run.exe' : 'run');
    console.log(`Starting Python script: ${executablePath}`);

    pythonProcess = spawn(executablePath);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        if (data.toString().includes("Starting server...")) {
            loadingWindow.close();

            win.loadURL(url.format({
                pathname: path.join(__dirname, './mainScreen.html'),
                protocol: 'file:',
                slashes: true
            }), {"extraHeaders" : "pragma: no-cache\n"});

            win.once('ready-to-show', () => {
                win.show();
                const menu = Menu.buildFromTemplate(template)
                Menu.setApplicationMenu(menu)
            });

            win.on('close', (event) => {
                event.preventDefault(); // Prevent the default close behavior
                win.hide();      // Hide the window instead of closing
            });
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
    });
}

app.whenReady().then(() => {
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
