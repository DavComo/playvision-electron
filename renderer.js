function toggleWindow(windowId, checked) {
    const panel = document.getElementById(windowId);
    const resizer = document.getElementById("resizer")
    if (checked) {
        panel.classList.remove("hidden");
        resizer.classList.remove("hidden");
    } else {
        panel.classList.add("hidden");
        resizer.classList.add("hidden");   
    }
}


// Listen for IPC messages from the main process
window.electronAPI.onToggleWindow((windowId, checked) => {
    toggleWindow(windowId, checked);
});

window.ipc.on('license-key-validified', data => {
  document.getElementById('bottom-panel-iframe').contentWindow.postMessage({
    type: 'license-key-validified',
    data
  }, '*');
});

window.addEventListener("message", async (event) => {
  if (event.data.type === "show-alert") {
    window.ipc.invoke("show-alert", {
      message: event.data.message,
      licenseError: event.data.licenseError
    });
  }
});