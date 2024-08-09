var docData = null;
var schools = [];

(function(window, document, undefined) {

    window.onload = init();

})(window, document, undefined);

var dynamodb;
var dynamoClient;
var tableName;

async function init() {  
    var inputs = document.getElementsByTagName("input")
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].value = "Loading..."
    };
    tableName = streamData.dbName;
    document.getElementById("serverName").value = tableName;
    // Initialize AWS SDK and DynamoDB client
    AWS.config.update({
        region: streamData.awsRegion,
        accessKeyId: streamData.accessKey,
        secretAccessKey: streamData.secretKey
    });

    dynamodb = new AWS.DynamoDB();
    dynamoClient = new AWS.DynamoDB.DocumentClient();

    initButtons();

    fetchData();
}


//Module functions

function initButtons() {
    function initNavBar() {
        function initNavTab(targetTab, targetPage) {
            var activeElements = document.getElementsByClassName("is-active");
            for (var i = 0; i <= activeElements.length; i++) {
                activeElements[0].classList.remove("is-active");
            }
            document.getElementById(targetTab).classList.add("is-active");
            document.getElementById(targetPage).classList.add("is-active");
        }

        var navBar = document.getElementById("navBar");
        for (var i = 0; i < navBar.children.length; i++) {
            document.getElementById(navBar.children[i].id).onclick = function() {
                var nameOfPage = this.id.charAt(4).toLowerCase() + this.id.slice(5).slice(0, -3)
                initNavTab(this.id, nameOfPage);
            };
        
        }
    }
    initNavBar();

    //Init Reset Value Button
    document.getElementById("resetValues").onclick = async function() {
        document.getElementById('colorDiv').innerHTML = "";
        await fetchData();

        var ms = docData["stopwatchms"];
        let seconds = Math.floor(ms / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);

        document.getElementById("valueMs").value = hours + " h : " + minutes + " m : " + seconds%60 + " s : " + String(ms%1000).padStart(3, '0') + " ms"
    };

    //Upload Data for all inputs
    document.getElementById("saveValues").onclick = async function() {
        document.getElementById("saveValues").innerText = "Save Successful"
        document.getElementById("saveValues").style.backgroundColor = "green"
        var choiceIds = ["eventScene"];
        var toggleIds = ["showEvent"];


        //Save Color Page
        schools.forEach(school => {
            var params = {
                TableName: tableName,
                Key: {
                  "valueId": "primaryColors"
                },
                UpdateExpression: ("set " + school + " = :r"),
                ExpressionAttributeValues: {
                    ":r": document.getElementById(school + "Primary").value,

                },
                ReturnValues: "UPDATED_NEW"
              };
              
            dynamoClient.update(params, function(err, data) {});

            var params = {
                TableName: tableName,
                Key: {
                  "valueId": "secondaryColors"
                },
                UpdateExpression: ("set " + school + " = :r"),
                ExpressionAttributeValues: {
                    ":r": document.getElementById(school + "Secondary").value,

                },
                ReturnValues: "UPDATED_NEW"
              };
              
            dynamoClient.update(params, function(err, data) {});
        });

        var params = {
            TableName: tableName,
            Key: {
              "valueId": "eventClassifier"
            },
            UpdateExpression: ("set eventName = :r, eventScene = :s, showEvent = :t"),
            ExpressionAttributeValues: {
                ":r": document.getElementById("eventNameIs").value,
                ":s": document.getElementById("eventScene").value,
                ":t": document.getElementById("showEvent").checked
            },
            ReturnValues: "UPDATED_NEW"
          };
          
        dynamoClient.update(params, function(err, data) {});

        var params = {
            TableName: tableName,
            Key: {
              "valueId": "gameScreen"
            },
            UpdateExpression: ("set gameName = :r, showScore = :s, sideOneName = :t, sideTwoName = :u, sideOneScore = :v, sideTwoScore = :w, showStopwatch = :x, periodIntervalSeconds = :y, periodMark = :z"),
            ExpressionAttributeValues: {
                ":r": document.getElementById("gameName").value,
                ":s": document.getElementById("showGame").checked,
                ":t": document.getElementById("side_1-name-scores").value,
                ":u": document.getElementById("side_2-name-scores").value,
                ":v": parseInt(document.getElementById("side_1-score").value),
                ":w": parseInt(document.getElementById("side_2-score").value),
                ":x": document.getElementById("showStopwatch").checked,
                ":y": parseInt(document.getElementById("periodInterval").value),
                ":z": document.getElementById("periodMark").value
            },
            ReturnValues: "UPDATED_NEW"
          };
          
        dynamoClient.update(params, function(err, data) {});

        var timeComponents = document.getElementById('startTime').value.split(':');

        var hours = parseInt(timeComponents[0], 10) || 0;
        var minutes = parseInt(timeComponents[1], 10) || 0;
        var seconds = parseInt(timeComponents[2], 10) || 0;

        var date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(seconds);

        var epochTimeInMs = date.getTime();

        var params = {
            TableName: tableName,
            Key: {
              "valueId": "startingSoon"
            },
            UpdateExpression: ("set eventTitle1 = :r, eventTitle2 = :s, nextEvent = :t, targetTimeMs = :u, themeSchool = :v"),
            ExpressionAttributeValues: {
                ":r": document.getElementById("eventTitle").value,
                ":s": document.getElementById("eventSubtitle").value,
                ":t": document.getElementById("nextEvent").value,
                ":u": epochTimeInMs.toString(),
                ":v": document.getElementById("themeSchool").value
            },
            ReturnValues: "UPDATED_NEW"
          };
          
        dynamoClient.update(params, function(err, data) {});

        await new Promise(r => setTimeout(r, 500));

        document.getElementById("saveValues").innerText = "Save Values"
        document.getElementById("saveValues").style.removeProperty("background-color")
        
    }
}


var dynamodb;
var docDataTempTemp;
var docDataTemp = {};
var colors = {};
var docData = {}

function fetchData() {
    tableName = document.getElementById("serverName").value;
    const params = {
        TableName: tableName,
    };

    dynamodb.scan(params, function(err, data) {
        if (err) {
            console.error("Error fetching data from DynamoDB:", err);
            if (err.code == "AccessDeniedException") {
                document.getElementById('serverStatus').style.color = "red"
                document.getElementById('serverStatus').innerText = "Access Denied/Doesn't Exist"
            } else if (err.code == "ValidationException") {
                document.getElementById('serverStatus').style.color = "red"
                document.getElementById('serverStatus').innerText = "Enter Database ID and Sync"
            }
        } else {
            // Update the UI with the fetched data
            document.getElementById('serverStatus').style.color = "green"
            document.getElementById('serverStatus').innerText = "Connected to " + tableName
            docDataTempTemp = data.Items;
            for (var index = 0; index < docDataTempTemp.length; index++) {
                var indexkey = docDataTempTemp[index].valueId.S;
                docDataTemp[indexkey] = docDataTempTemp[index];
            }
            updateData()
        }
        return "done";
    });
}

function updateData() {
    document.getElementById("blurrableElement").classList.remove("blur");

    docData = {
        "team_1" : docDataTemp['gameScreen']['sideOneName'].S,
        "team_2" : docDataTemp['gameScreen']['sideTwoName'].S,
        "team_1s" : docDataTemp['gameScreen']['sideOneScore'].N,
        "team_2s" : docDataTemp['gameScreen']['sideTwoScore'].N,
        "gameName_1" : docDataTemp['gameScreen']['gameName'].S,
        "hide_1" : docDataTemp['gameScreen']['showScore'].BOOL,
        "stopwatchms" : docDataTemp['gameScreen']['stopwatchValueMs'].N,
        "stopwatchrunning" : docDataTemp['gameScreen']['stopwatchRunning'].BOOL,
        "startedAt" : docDataTemp['gameScreen']['stopwatchStartedAt'].N,
        "showStopwatch" : docDataTemp['gameScreen']['showStopwatch'].BOOL,
        "eventName" : docDataTemp['eventClassifier']['eventName'].S,
        "eventScene" : docDataTemp['eventClassifier']['eventScene'].S,
        "showEvent" : docDataTemp['eventClassifier']['showEvent'].BOOL,
        "periodIntervalSeconds" : docDataTemp['gameScreen']['periodIntervalSeconds'].N,
        "periodMark" : docDataTemp['gameScreen']['periodMark'].S,
        "eventTitle-1" : docDataTemp['startingSoon']['eventTitle1'].S,
        "eventTitle-2" : docDataTemp['startingSoon']['eventTitle2'].S,
        "nextEvent" : docDataTemp['startingSoon']['nextEvent'].S,
        "targetTimeMs" : docDataTemp['startingSoon']['targetTimeMs'].S,
        "themeSchool" : docDataTemp['startingSoon']['themeSchool'].S
    }

    schools = [];

    for (var i = 0; i < Object.keys(docDataTemp['primaryColors']).length; i++) {
        var schoolCode = Object.keys(docDataTemp['primaryColors'])[i];
        var colorDiv = document.getElementById("colorDiv");
        if (schoolCode != "valueId") {
            schools.push(schoolCode);
            colors[schoolCode + "_primary"] = docDataTemp['primaryColors'][schoolCode].S;
            colors[schoolCode + "_secondary"] = docDataTemp['secondaryColors'][schoolCode].S;

            var schoolDiv = document.createElement("dl");
            schoolDiv.classList.add("formRow","formRow--input");
            var schoolName_0 = document.createElement("dt");
            var schoolName_1 = document.createElement("div");
            schoolName_1.classList.add("formRow-labelWrapper");
            var schoolName_2 = document.createElement("label");
            schoolName_2.classList.add("formRow-label");
            schoolName_2.innerText = schoolCode.toUpperCase() + " Colors";

            schoolName_1.appendChild(schoolName_2);
            schoolName_0.appendChild(schoolName_1);

            var schoolDd = document.createElement("dd");
            var primaryDiv = document.createElement("div");
            primaryDiv.classList.add("inputGroup", "inputGroup--joined");
            var spanDiv = document.createElement("span");
            spanDiv.classList.add("inputGroup-text");
            spanDiv.innerText = "Primary";
            var inputDiv = document.createElement("input");
            inputDiv.type = "text";
            inputDiv.classList.add("input", "texts", "t1");
            inputDiv.id = schoolCode + "Primary";
            var exampleDiv = document.createElement("div");
            exampleDiv.classList.add("color-picker");
            exampleDiv.id = schoolCode + "PrimaryColor";

            primaryDiv.appendChild(spanDiv);
            primaryDiv.appendChild(inputDiv);
            primaryDiv.appendChild(exampleDiv);

            var secondaryDiv = document.createElement("div");
            secondaryDiv.classList.add("inputGroup", "inputGroup--joined");
            var secondaryspanDiv = document.createElement("span");
            secondaryspanDiv.classList.add("inputGroup-text");
            secondaryspanDiv.innerText = "Secondary";
            var secondaryinputDiv = document.createElement("input");
            secondaryinputDiv.type = "text";
            secondaryinputDiv.classList.add("input", "texts", "t1");
            secondaryinputDiv.id = schoolCode + "Secondary";
            var secondaryexampleDiv = document.createElement("div");
            secondaryexampleDiv.classList.add("color-picker");
            secondaryexampleDiv.id = schoolCode + "SecondaryColor";

            secondaryDiv.appendChild(secondaryspanDiv);
            secondaryDiv.appendChild(secondaryinputDiv);
            secondaryDiv.appendChild(secondaryexampleDiv);

            schoolDd.appendChild(primaryDiv);
            schoolDd.appendChild(secondaryDiv);

            schoolDiv.appendChild(schoolName_0);
            schoolDiv.appendChild(schoolDd);

            colorDiv.appendChild(schoolDiv);

            var separator = document.createElement("hr");
            separator.classList.add("formRowSep");
            colorDiv.appendChild(separator);
        }
    }

    //Color Page
    for (var i = 0; i < schools.length; i++) {
        document.getElementById(schools[i] + "Primary").value = colors[schools[i] + "_primary"];
        document.getElementById(schools[i] + "Secondary").value = colors[schools[i] + "_secondary"];

        document.getElementById(schools[i] + "PrimaryColor").style.backgroundColor = colors[schools[i] + "_primary"];
        document.getElementById(schools[i] + "SecondaryColor").style.backgroundColor = colors[schools[i] + "_secondary"];

    }

    //Event Name
    document.getElementById("eventNameIs").value = docData["eventName"];
    document.getElementById(docData["eventScene"]).selected = true;
    document.getElementById("showEvent").checked = docData["showEvent"];

    //Starting Soon
    document.getElementById("eventTitle").value = docData["eventTitle-1"];
    document.getElementById("eventSubtitle").value = docData["eventTitle-2"];
    document.getElementById("nextEvent").value = docData["nextEvent"];

    var targetTimeMs = parseInt(docData["targetTimeMs"]);
    var date = new Date(targetTimeMs);

    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    hours = (hours < 10 ? '0' : '') + hours;
    minutes = (minutes < 10 ? '0' : '') + minutes;
    seconds = (seconds < 10 ? '0' : '') + seconds;

    var timeString = hours + ':' + minutes + ':' + seconds;
    document.getElementById("startTime").value = timeString
    document.getElementById("themeSchool").value = docData["themeSchool"];

    //Team Scores
    document.getElementById("side_1-name-scores").value = docData["team_1"];
    document.getElementById("side_2-name-scores").value = docData["team_2"];

    document.getElementById("side_1-score").value = docData["team_1s"];
    document.getElementById("side_2-score").value = docData["team_2s"];

    document.getElementById("gameName").value = docData["gameName_1"];

    document.getElementById("showGame").checked = docData["hide_1"];

    //Stopwatch
    if (document.getElementById("valueMs").value == "Loading...") {
        document.getElementById("valueMs").value = "0 h : 0 m : 0 s : 000 ms"
    }
    document.getElementById("periodInterval").value = docData["periodIntervalSeconds"];
    document.getElementById("periodMark").value = docData["periodMark"];
    document.getElementById("showStopwatch").checked = docData["showStopwatch"];

    initStopwatch();
}


var stopwatchStarted;
var startOfStopwatch;
var addedTime = 0;

function initStopwatch() {
    stopwatchStarted = docData["stopwatchrunning"];
    startOfStopwatch = docData["startedAt"];
    //Init stopwatch buttons
    if (stopwatchStarted) {
        document.getElementById("startAndStop").innerText = 'Stop';
    }

    var ms = docData["stopwatchms"]
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    document.getElementById("valueMs").value = hours + " h : " + minutes%60 + " m : " + seconds%60 + " s : " + String(ms%1000).padStart(3, '0') + " ms"

    document.getElementById("startAndStop").onclick = function() {
        if (stopwatchStarted == true) {
            stopwatchStarted = false;
            document.getElementById("startAndStop").innerText = 'Start';
            var params = {
                TableName: tableName,
                Key: {
                  "valueId": "gameScreen"
                },
                UpdateExpression: "set stopwatchRunning = :r, stopwatchStartedAt = :s, stopwatchValueMs = :v",
                ExpressionAttributeValues: {
                    ":r": false,
                    ":s": startOfStopwatch - addedTime,
                    ":v": timeStringToMs(document.getElementById("valueMs").value)

                },
                ReturnValues: "UPDATED_NEW"
              };
              
            dynamoClient.update(params, function(err, data) {});

        } else if (stopwatchStarted == false) {
            startOfStopwatch = Date.now();
            if (document.getElementById("valueMs").value != NaN) {
                addedTime = timeStringToMs(document.getElementById("valueMs").value);
            } else {
                addedTime = 0;
            }
            stopwatchStarted = true;
            document.getElementById("startAndStop").innerText = 'Stop';

            var params = {
                TableName: tableName,
                Key: {
                  "valueId": "gameScreen"
                },
                UpdateExpression: "set stopwatchRunning = :r, stopwatchStartedAt = :s, stopwatchValueMs = :v",
                ExpressionAttributeValues: {
                    ":r": true,
                    ":s": startOfStopwatch - addedTime,
                    ":v": timeStringToMs(document.getElementById("valueMs").value)
                },
                ReturnValues: "UPDATED_NEW"
              };
              
            dynamoClient.update(params, function(err, data) {});

            updateStopwatch();
        }
    };
    updateStopwatch();

    document.getElementById("reset").onclick = function() {
        addedTime = 0;
        startOfStopwatch = Date.now();
        document.getElementById("valueMs").value = "0 h : 0 m : 0 s : 000 ms"

        var params = {
            TableName: tableName,
            Key: {
              "valueId": "gameScreen"
            },
            UpdateExpression: "set stopwatchRunning = :r, stopwatchStartedAt = :s, stopwatchValueMs = :v",
            ExpressionAttributeValues: {
                ":r": stopwatchStarted,
                ":s": Date.now(),
                ":v": 0
            },
            ReturnValues: "UPDATED_NEW"
          };
          
        dynamoClient.update(params, function(err, data) {});
    }
}

var timeoutInterval = 0;

async function updateStopwatch() {
    if (document.getElementById("valueMs").value == "") {
        document.getElementById("valueMs").value = "0 h : 0 m : 0 s : 000 ms"
    }

    while (stopwatchStarted) {
        timeoutInterval--;
        var ms = (Date.now() - startOfStopwatch) + addedTime;
        let seconds = Math.floor(ms / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);
        if (seconds % parseInt(document.getElementById('periodInterval').value) == 0 && ms % 1000 <= 10 && timeoutInterval <= 0 && seconds != 0) {
            stopwatchStarted = false;
            document.getElementById("startAndStop").innerText = 'Start';
            var params = {
                TableName: tableName,
                Key: {
                  "valueId": "gameScreen"
                },
                UpdateExpression: "set stopwatchRunning = :r, stopwatchStartedAt = :s, stopwatchValueMs = :v",
                ExpressionAttributeValues: {
                    ":r": false,
                    ":s": startOfStopwatch - addedTime,
                    ":v": timeStringToMs(document.getElementById("valueMs").value)

                },
                ReturnValues: "UPDATED_NEW"
              };
              
            dynamoClient.update(params, function(err, data) {});
            document.getElementById("valueMs").value = hours + " h : " + minutes%60 + " m : " + seconds%60 + " s : " + String(ms%1000).padStart(3, '0') + " ms"
            timeoutInterval = 50;
        } else {
            document.getElementById("valueMs").value = hours + " h : " + minutes%60 + " m : " + seconds%60 + " s : " + String(ms%1000).padStart(3, '0') + " ms"
        }
        await sleep(1);
    }
    if (stopwatchStarted == false) {
        if (docData["stopwatchms"] != timeStringToMs(document.getElementById("valueMs").value)) {
            var params = {
                Key: {
                  "valueId": "gameScreen"
                },
                UpdateExpression: "set stopwatchValueMs = :v",
                ExpressionAttributeValues: {
                    ":v": timeStringToMs(document.getElementById("valueMs").value)

                },
                ReturnValues: "UPDATED_NEW"
              };
              
            dynamoClient.update(params, function(err, data) {});
        }
    }
}

function timeStringToMs(timeString) {
    var [hours, minutes, seconds, milliseconds] = timeString.split(" : ")
    hours = parseInt(hours.slice(0, -2));
    minutes = parseInt(minutes.slice(0, -2));
    seconds = parseInt(seconds.slice(0, -2));
    milliseconds = parseInt(milliseconds.slice(0, -2));
  
    const msInHour = hours * 60 * 60 * 1000;
    const msInMinute = minutes * 60 * 1000;
    const msInSecond = seconds * 1000;
  
    const totalMs = msInHour + msInMinute + msInSecond + milliseconds;
    return totalMs;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
