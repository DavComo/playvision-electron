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

}

window.saveLicenseKey = async function () {
    key = document.getElementById("licenseKey").value
    validateLicenseKey(key)
}

const validateLicenseKey = async function (key) {
    document.getElementById("licenseKey").disabled = true
    document.getElementById("licenseKeyButton").disabled = true

    document.getElementById("licenseKey").value = key

    formattedData = `
        {"licenseKey" : "${key}"}
        `
        
        window.fileAPI.saveData('.licenseKey.json', formattedData)

        
    const accessKeyReponse = await fetch("https://lgphy9q5lb.execute-api.eu-central-1.amazonaws.com/?licenseKey=" + key)
    if (accessKeyReponse.status == 200) {
        document.getElementById("licenseKey").style["borderColor"] = 'green'
        document.getElementById("licenseKeyInfo").style["color"] = 'green'
        document.getElementById("licenseKeyInfo").innerText = 'Valid License Key!'
        const responseJson = await accessKeyReponse.json()
        console.log(responseJson);

        formattedData = {
            dbName: `${responseJson.defaultStream}`,
            accessKey: `${responseJson.accessKey}`,
            secretKey: `${responseJson.secretKey}`,
            awsRegion: "eu-central-1"
        }

        data = await window.fileAPI.loadData(".streamData.json")
        if (data.ok == true) {
            formattedData.dbName = data.data.dbName
        }
        console.log("dawwad");
        
        window.fileAPI.saveData('.streamData.json', formattedData)
        window.ipc.send('valid-license-key', { responseJson });
    } else {
        document.getElementById("licenseKey").style["borderColor"] = 'red'
        document.getElementById("licenseKeyInfo").style["color"] = 'red'
        document.getElementById("licenseKeyInfo").innerText = 'Invalid License Key'
    }

    document.getElementById("licenseKey").disabled = false
    document.getElementById("licenseKeyButton").disabled = false

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

    data = await window.fileAPI.loadData(".licenseKey.json")
    if (data.ok == true) {
        validateLicenseKey(data.data.licenseKey)
    }
}
