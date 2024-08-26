window.switchViews = function (element) {
    document.querySelector('.category-tab.active').classList.remove('active')
    element.classList.add('active')

    document.querySelector('.setting-category.active').classList.remove('active')
    document.querySelector('#' + element.dataset['container']).classList.add('active')
}

window.saveValue = async function (value, key, element) {
    if (element.checkValidity() === false) {
        return false
    }
    await window.myStore.set(key, value)

    if (element.id = 'toggleAuthentication') {
        
    }
}

window.onload = async function () {
    let port = await window.myStore.get('obsPort')
    if (port === undefined) {
        window.myStore.set('obsPort', 4455)
        port = 4455
    }
    document.getElementById('portNumber').value = port

    let authenticationEnabled = await window.myStore.get('obsAuthenticationEnabled')
    if (authenticationEnabled === undefined) {
        window.myStore.set('obsAuthenticationEnabled', false)
        authenticationEnabled = false
    }
    document.getElementById('toggleAuthentication').checked = authenticationEnabled
    if (authenticationEnabled) {
        document.getElementById('authenticationPassword').disabled = false
    } else {
        document.getElementById('authenticationPassword').disabled = true
        document.getElementById('authenticationPassword').parentElement.classList.add('disabled')
    }

    let authenticationPassword = await window.myStore.get('obsAuthenticationPassword')
    if (authenticationPassword === undefined) {
        window.myStore.set('obsAuthenticationPassword', '')
        authenticationPassword = ''
    }
    document.getElementById('authenticationPassword').value = authenticationPassword

    let serverIp = await window.myStore.get('obsServerIp')
    if (serverIp === undefined) {
        window.myStore.set('obsServerIp', 'localhost')
        serverIp = 'localhost'
    }
    document.getElementById('serverIP').value = serverIp
}
