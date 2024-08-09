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
    console.log("Hello")
    toggleWindow(windowId, checked);
});