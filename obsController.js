import { OBSWebSocket } from "./node_modules/obs-websocket-js/dist/obs-ws.js"
const obs = new OBSWebSocket();

async function connectOBS() {
    try {
        await obs.connect();
        console.log('Connected to OBS WebSocket');
    } catch (err) {
        console.error('Failed to connect to OBS WebSocket:', err);
    }
}

async function getSceneScreenshot(sceneName) {
    try {
        const tempFilePath = '/tmp/' + sceneName + '.png';

        const response = await obs.call('GetSourceScreenshot', {
            sourceName: sceneName,
            imageFormat: 'png',
            imageWidth: 512,
            imageHeight: 288
        });
        return response.imageData;
    } catch (err) {
        console.error('Failed to get screenshot:', err);
    }
}

async function updatePreviews() {
    let response = await obs.call('GetCurrentPreviewScene');

    let screenshot = await getSceneScreenshot(response.sceneName);
    if (screenshot) {
        // Send this data URL to your HTML/Renderer process to display
        document.getElementById('preview').src = screenshot
    }

    response = await obs.call('GetCurrentProgramScene');

    screenshot = await getSceneScreenshot(response.sceneName);
    if (screenshot) {
        // Send this data URL to your HTML/Renderer process to display
        document.getElementById('program').src = screenshot
    }
}

async function updateLiveSign() {
    const response = await obs.call('GetStreamStatus')
    const isLive = response.outputActive

    const liveSign = document.getElementById("liveSign")

    if (isLive) {
        liveSign.style.color = "rgb(226, 20, 60)"
        liveSign.innerText = "LIVE"
    } else {
        liveSign.style.color = "rgb(0, 128, 0)"
        liveSign.innerText = "OFFLINE"
    }
}

async function updateEverything() {
    updatePreviews();
    updateLiveSign()
}


// Connect to OBS and get the screenshot
connectOBS().then(async () => {
    setInterval(updateEverything, 500);
});

