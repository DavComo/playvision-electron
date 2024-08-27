import { OBSWebSocket } from "./node_modules/obs-websocket-js/dist/obs-ws.js";
const obs = new OBSWebSocket();

let websocketConnected = false;
let existingScenes = [];
let lastUpdated = Infinity;

async function connectOBS() {
    try {
        await obs.connect();
        websocketConnected = true;
        document.getElementById('body').classList.remove('blur');
        document.getElementById('error-box').classList.add('hidden');
        console.log('Connected to OBS WebSocket');
    } catch (err) {
        announceBrokenConnection();
        websocketConnected = false;
        console.error('Failed to connect to OBS WebSocket:', err);
    }
}

async function setInitialValues() {
    let response = await obs.call('GetStreamStatus');
    let isLive = response.outputActive;

    const liveSign = document.getElementById("liveSign");

    if (isLive) {
        liveSign.style.filter = "none";
        liveSign.innerText = "LIVE";
        document.getElementById('toggleStreamText').innerText = "Stop Stream";
        document.getElementById('program').style.animation = "blink 2s infinite";
        document.getElementById('droppedFramesBar').classList.remove('inactive');
        document.getElementById('streamingOutputDot').classList.remove('inactive');
        document.getElementById('congestion').classList.remove('inactive');
    } else {
        liveSign.style.filter = "grayscale(100%)";
        liveSign.innerText = "INACTIVE";
        document.getElementById('toggleStreamText').innerText = "Start Stream";
        document.getElementById('program').style.animation = "none";
        document.getElementById('droppedFramesBar').classList.add('inactive');
        document.getElementById('streamingOutputDot').classList.add('inactive');
        document.getElementById('congestion').classList.add('inactive');
    }


    response = await obs.call('GetRecordStatus');
    let isRecording = response.outputActive;

    if (isRecording) {
        document.getElementById('toggleRecordingText').innerText = "Stop Recording";
        document.getElementById('recordingOutputDot').classList.remove('inactive');
    } else {
        document.getElementById('toggleRecordingText').innerText = "Start Recording";
        document.getElementById('recordingOutputDot').classList.add('inactive');
    }


    response = await obs.call('GetSceneList');
    const scenes = response.scenes;

    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        let scenePreviewInstance = document.createElement('img');
        
        scenePreviewInstance.onclick = switchPreviewInstance;
        scenePreviewInstance.id = scene.sceneName;
        scenePreviewInstance.src = "";
        if (scene.sceneName == response.currentPreviewSceneName) {
            scenePreviewInstance.classList.add('preview');
        }
        if (scene.sceneName == response.currentProgramSceneName) {
            scenePreviewInstance.classList.add('program');
        }
        if (document.getElementById('scenePreviewContainer').childElementCount <= 4) {document.getElementById('scenePreviewContainer').appendChild(scenePreviewInstance);}


        if (existingScenes.includes(scene.sceneName)) {
            continue;
        }

        let sceneElement = document.createElement('div');
        sceneElement.innerText = scene.sceneName;
        sceneElement.classList.add('available-scene');
        sceneElement.setAttribute('data-scene-uuid', scene.sceneUuid);
        sceneElement.onclick = switchPreviews;
        document.getElementById('scene-list').appendChild(sceneElement);
        existingScenes.push(scene.sceneName);
    }

    response = await obs.call('GetCurrentPreviewScene');
    document.querySelector(`[data-scene-uuid="${response.sceneUuid}"]`).classList.add('selectedPreview');

    response = await obs.call('GetCurrentProgramScene');
    document.querySelector(`[data-scene-uuid="${response.sceneUuid}"]`).classList.add('selectedProgram');


    response = await obs.call('GetSceneTransitionList');
    let transitions = response.transitions;

    for (let i = 0; i < transitions.length; i++) {
        const transition = transitions[i];
        let transitionElement = document.createElement('option');
        transitionElement.innerText = transition.transitionName;
        transitionElement.value = transition.transitionUuid;
        document.getElementById('transitionOptions').appendChild(transitionElement);
    }
    document.getElementById('transitionOptions').value = response.currentSceneTransitionUuid;
}

async function getSceneScreenshot(sceneName) {
    try {
        const response = await obs.call('GetSourceScreenshot', {
            sourceName: sceneName,
            imageFormat: 'png',
            imageWidth: 1024,
            imageHeight: 576
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
        document.getElementById('preview').src = screenshot;
        document.getElementById('preview').dataset.sceneName = response.sceneName;
        
        if (document.getElementById(response.sceneName)) {
            document.getElementById(response.sceneName).src = screenshot;
        }
    }

    response = await obs.call('GetCurrentProgramScene');

    screenshot = await getSceneScreenshot(response.sceneName);
    if (screenshot) {
        document.getElementById('program').src = screenshot;
        document.getElementById('program').dataset.sceneName = response.sceneName;

        if (document.getElementById(response.sceneName)) {
            document.getElementById(response.sceneName).src = screenshot;
        }
    }

    if (lastUpdated >= 4) {
        for (let i = 0; i < document.getElementById('scenePreviewContainer').childElementCount; i++) {
            let scenePreviewInstance = document.getElementById('scenePreviewContainer').children[i];
            screenshot = await getSceneScreenshot(scenePreviewInstance.id);
            if (screenshot) {
                scenePreviewInstance.src = screenshot;
            }
        }
        lastUpdated = 0
    } else {
        lastUpdated += 1;
    }
}

async function updateStats() {
    let response = await obs.call('GetStreamStatus');

    const outputTotalFrames = response.outputTotalFrames;
    const outputSkippedFrames = response.outputSkippedFrames;
    const percentageFramesMissed = Math.round(outputSkippedFrames / outputTotalFrames * 1000) / 10;

    document.getElementById('droppedFramesStats').innerText = outputSkippedFrames + '/' + outputTotalFrames;
    document.getElementById('droppedFramesPercentage').innerText = percentageFramesMissed + '%';

    document.getElementById('segment').style.width = percentageFramesMissed + '%';

    document.getElementById('streamingDurationTimer').innerText = new Date(response.outputDuration).toISOString().substr(11, 8);

    document.getElementById('congestion').innerText = Math.round(response.outputCongestion * 1000) / 10 + '%';
    if (response.outputCongestion > 0.8) {
        document.getElementById('congestion').style.color = "rgb(226, 20, 60)";
    } else {
        document.getElementById('congestion').style.color = "rgb(0, 128, 0)";
    }

    response = await obs.call('GetRecordStatus');
    document.getElementById('recordingDurationTimer').innerText = new Date(response.outputDuration).toISOString().substr(11, 8);
}

async function updateEverything() {
    if (!websocketConnected) {
        await connectOBS();
        return;
    }
    try {
        await updatePreviews();
        await updateStats();
    } catch (error) {
        console.log(error);

        if (error.message == "Not connected") {
            announceBrokenConnection();
            websocketConnected = false;
        }
    }
}

obs.on('StreamStateChanged', (data) => {
    const liveSign = document.getElementById("liveSign");

    if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STOPPING' || data.outputState == 'OBS_WEBSOCKET_OUTPUT_STARTING') {
        document.getElementById('toggleStreamText').classList.add('hidden');
        document.getElementById('toggleStreamLoader').classList.remove('hidden');
    } else if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STARTED' || data.outputState == 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
        document.getElementById('toggleStreamText').classList.remove('hidden');
        document.getElementById('toggleStreamLoader').classList.add('hidden');
    }
    if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STARTED') {
        document.getElementById('toggleStreamText').innerText = "Stop Stream";
        liveSign.style.filter = "none";
        liveSign.innerText = "LIVE";
        document.getElementById('droppedFramesBar').classList.remove('inactive');
        document.getElementById('streamingOutputDot').classList.remove('inactive');
        document.getElementById('program').style.animation = "blink 2s infinite";
        document.getElementById('congestion').classList.remove('inactive');
    } else if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
        document.getElementById('toggleStreamText').innerText = "Start Stream";
        liveSign.style.filter = "grayscale(100%)";
        liveSign.innerText = "INACTIVE";
        document.getElementById('droppedFramesBar').classList.add('inactive');
        document.getElementById('streamingOutputDot').classList.add('inactive');
        document.getElementById('program').style.animation = "none";
        document.getElementById('congestion').classList.add('inactive');
    }
})

obs.on('RecordStateChanged', (data) => {
    if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STOPPING' || data.outputState == 'OBS_WEBSOCKET_OUTPUT_STARTING') {
        document.getElementById('toggleRecordingText').classList.add('hidden');
        document.getElementById('toggleRecordingLoader').classList.remove('hidden');
    } else if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STARTED' || data.outputState == 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
        document.getElementById('toggleRecordingText').classList.remove('hidden');
        document.getElementById('toggleRecordingLoader').classList.add('hidden');
    }
    if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STARTED') {
        document.getElementById('toggleRecordingText').innerText = "Stop Recording";
        document.getElementById('recordingOutputDot').classList.remove('inactive');
    } else if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
        document.getElementById('toggleRecordingText').innerText = "Start Recording";
        document.getElementById('recordingOutputDot').classList.add('inactive');
    }
})

obs.on('SceneTransitionStarted', (data) => {
    document.getElementById('transitionArrowLeft').classList.remove('hidden');
    document.getElementById('transitionArrowRight').classList.remove('hidden');
})

obs.on('SceneTransitionEnded', (data) => {
    document.getElementById('transitionArrowLeft').classList.add('hidden');
    document.getElementById('transitionArrowRight').classList.add('hidden');
})

obs.on('CurrentPreviewSceneChanged', (data) => {
    document.getElementById('changeSceneLoader').classList.add('hidden');
    if (document.getElementsByClassName('selectedPreview').length > 0) {
        document.getElementsByClassName('selectedPreview')[0].classList.remove('selectedPreview');
    }
    document.querySelector(`[data-scene-uuid="${data.sceneUuid}"]`).classList.add('selectedPreview');
    
    if (document.getElementsByClassName('preview').length > 0) {
        document.getElementsByClassName('preview')[0].classList.remove('preview');
    }
    document.getElementById(data.sceneName).classList.add('preview');
})

obs.on('CurrentProgramSceneChanged', (data) => {
    document.getElementById('changeSceneLoader').classList.add('hidden');
    if (document.getElementsByClassName('selectedProgram').length > 0) {
        document.getElementsByClassName('selectedProgram')[0].classList.remove('selectedProgram');
    }
    document.querySelector(`[data-scene-uuid="${data.sceneUuid}"]`).classList.add('selectedProgram');

    if (document.getElementsByClassName('program').length > 0) {
        document.getElementsByClassName('program')[0].classList.remove('program');
    }
    document.getElementById(data.sceneName).classList.add('program');
})

obs.on('CurrentSceneTransitionChanged', (data) => {
    document.getElementById('transitionOptions').value = data.transitionUuid;
})


// Connect to OBS and get the screenshot
connectOBS().then(async () => {
    setInitialValues();
    setInterval(updateEverything, 500);
});


function announceBrokenConnection() {
    document.getElementById('body').classList.add('blur');
    document.getElementById('error-box').classList.remove('hidden');
    document.getElementById('error-title').innerText = "Error connecting to OBS";
    document.getElementById('error-message').innerHTML = 'Make sure OBS is running and the WebSocket server is enabled"PlayVision cannot connect to OBS Websocket, please fix before using OBS Control. Ensure OBS is running on port 4455 without a password, and OBS Websocket is <a style="cursor: help;" href="https://obsproject.com/kb/remote-control-guide">turned on.</a> Please refresh with Cmd+R or Ctrl+R after fixing the issue.';
}

window.toggleStream = async function () {
    if (document.getElementById('toggleStreamText').innerText == "Stop Stream") {
        await obs.call('StopStream');
    } else {
        await obs.call('StartStream');
    }
}

window.toggleRecording = async function () {
    if (document.getElementById('toggleRecordingText').innerText == "Stop Recording") {
        await obs.call('StopRecord');
        document.getElementById('toggleRecordingText').innerText = "Stop Recording";
    } else {
        await obs.call('StartRecord');
        document.getElementById('toggleRecordingText').innerText = "Start Recording";
    }
}

window.activateTransition = async function () {
    await obs.call('TriggerStudioModeTransition');
}

window.switchPreviews = async function () {
    if (this.classList.contains('selectedPreview')) {
        return;
    }

    document.getElementById('changeSceneLoader').classList.remove('hidden');
    obs.call('SetCurrentPreviewScene', {
        sceneUuid: this.getAttribute('data-scene-uuid')
    });
}

window.changeTransition = async function () {
    obs.call('SetCurrentSceneTransition', {
        transitionName: document.getElementById('transitionOptions').selectedOptions[0].innerText
    });
}

window.switchPreviewInstance = async function () {
    this.id = existingScenes[(existingScenes.indexOf(this.id) + 1) % existingScenes.length];
    if (Array.from(this.classList).includes('preview')) {
        this.classList.remove('preview');
    }
    if (Array.from(this.classList).includes('program')) {
        this.classList.remove('program');
    }

    
    if (document.getElementsByClassName('preview').length > 0) {
        document.getElementsByClassName('preview')[0].classList.remove('preview');
    }
    document.getElementById(document.getElementById('preview').dataset.sceneName).classList.add('preview');

    if (document.getElementsByClassName('program').length > 0) {
        document.getElementsByClassName('program')[0].classList.remove('program');
    }
    document.getElementById(document.getElementById('program').dataset.sceneName).classList.add('program');
}