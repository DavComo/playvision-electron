const preferences = {
    "activeViews": {
        "OBS" : true,
        "Control" : true
    },
    "resizerPosotion" : "58%"
}

window.getPreferences = function () {
  return preferences
}

window.setPreferences = function (preferenceName, value) {
  preferences[preferenceName] = value
}
