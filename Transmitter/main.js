var docData = null;
var schools = [];

(function(window, document, undefined) {

    window.onload = init("");

})(window, document, undefined);

var dynamodb;
var dynamoClient;
var s3Client;
var s3BaseLocation;
var tableName;
var intervalId;
var parsedBaseUrl;


window.addEventListener('message', event => {
  if (event.data.type === 'license-key-validified') {
    init(event.data.data.responseJson)
  }
});


async function init(responseJson) {  
    if (responseJson == "") {
        var data = await window.fileAPI.loadData(".licenseKey.json")
        if (data.ok == false) {
            document.getElementById('blurrableElement').classList.add("blur");
            window.parent.postMessage({
                type: "show-alert",
                licenseError: true,
                message: "Enter valid license key in settings."
            }, "*");
            return
        }
        const accessKeyReponse = await fetch("https://lgphy9q5lb.execute-api.eu-central-1.amazonaws.com/?licenseKey=" + data.data.licenseKey)
        responseJson = await accessKeyReponse.json()
        if (accessKeyReponse.status != 200) {
            document.getElementById('blurrableElement').classList.add("blur");
            window.parent.postMessage({
                type: "show-alert",
                message: "Enter valid license key in settings."
            }, "*");
            return
        }
    }

    var inputs = document.getElementsByTagName("input")
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type == "file") {
            continue;
        }
        inputs[i].value = "Loading..."
    };
    var data = await window.fileAPI.loadData(".streamData.json")
    if ( data.ok == true ) {
        if (data.data.dbName) {
            tableName = data.data.dbName;
        } else {
            tableName = ""
        }
    } else {
        tableName = ""
    }
    document.getElementById("serverName").value = tableName;
    // Initialize AWS SDK and DynamoDB client
    AWS.config.update({
        region: "eu-central-1",
        accessKeyId: responseJson.accessKey,
        secretAccessKey: responseJson.secretKey
    });

    s3BaseLocation = responseJson.s3BaseLocation;

    dynamodb = new AWS.DynamoDB();
    dynamoClient = new AWS.DynamoDB.DocumentClient();
    s3Client = new AWS.S3();


    initButtons();

    fetchData();
}



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

        var data = await window.fileAPI.loadData(".streamData.json")
        if (data.ok == true) {
            data.data.dbName = document.getElementById("serverName").value
        }
        
        window.fileAPI.saveData('.streamData.json', data.data)
    };

    //Upload Data for all inputs
    document.getElementById("saveValues").onclick = async function() {
        document.getElementById("saveValues").innerText = "Save Successful"
        document.getElementById("saveValues").style.backgroundColor = "green"
        var choiceIds = ["eventScene"];
        var toggleIds = ["showEvent"];


        //Save Color Page
        schools.forEach(school => {
            if (isValidHex(document.getElementById(school + "Primary").value) == false) {
                document.getElementById(school + "Primary").value = colors[school + "_primary"]
            }
            if (isValidHex(document.getElementById(school + "Secondary").value) == false) {
                document.getElementById(school + "Secondary").value = colors[school + "_secondary"]
            }
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

            colors[school + "_primary"] = document.getElementById(school + "Primary").value;
            colors[school + "_secondary"] = document.getElementById(school + "Secondary").value;
        });

        var schoolImageDivs = document.getElementsByClassName('schoolDd')

        var colorInputs = document.getElementsByClassName('color-input')
        Array.from(colorInputs).forEach((colorInput) => {
            colorInput.parentElement.getElementsByClassName('color-picker')[0].style['background-color'] = colorInput.value
        });

        var newIconMatchings = {};
        for (var s = 0; s < schoolImageDivs.length; s++) {
            var div = schoolImageDivs[s]
            var divSchoolCode = div.id
            var selectedImage = div.getElementsByClassName('image-picker')[0].value

            var params = {
                TableName: tableName,
                Key: {
                "valueId": "schoolIconURL"
                },
                UpdateExpression: (`set ${divSchoolCode} = :r`),
                ExpressionAttributeValues: {
                    ":r": selectedImage
                },
                ReturnValues: "UPDATED_NEW"
            };
            
            dynamoClient.update(params, function(err, data) {});
        }

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

        var sideOneTheme;
        var sideTwoTheme;

        if (document.getElementById("side_1-matchTheme").checked) {
            sideOneTheme = document.getElementById("side_1-name-scores").value
            var opts = document.getElementById("side_1-theme").options
            const vals = Array.from(opts)
                .map(el => el.value.toLowerCase()); 
            if (vals.includes(sideOneTheme.toLowerCase())) {
                document.getElementById("side_1-theme").value = sideOneTheme.toUpperCase()
            } else {
                sideOneTheme = document.getElementById("side_1-theme").value
                document.getElementById("side_1-matchTheme").checked = false
                document.getElementById("side_1-theme").disabled = false
            }
        } else {
            sideOneTheme = document.getElementById("side_1-theme").value
        }
        if (document.getElementById("side_2-matchTheme").checked) {
            sideTwoTheme = document.getElementById("side_2-name-scores").value
            var opts = document.getElementById("side_2-theme").options
            const vals = Array.from(opts)
                .map(el => el.value.toLowerCase()); 
            if (vals.includes(sideTwoTheme.toLowerCase())) {
                document.getElementById("side_2-theme").value = sideTwoTheme.toUpperCase()
            } else {
                sideTwoTheme = document.getElementById("side_2-theme").value
                document.getElementById("side_2-matchTheme").checked = false
                document.getElementById("side_2-theme").disabled = false
            }
        } else {
            sideTwoTheme = document.getElementById("side_2-theme").value
        }

        

        var params = {
            TableName: tableName,
            Key: {
              "valueId": "gameScreen"
            },
            UpdateExpression: ("set gameName = :r, showScore = :s, showBasketballStats = :f, sideOneName = :t, sideTwoName = :u, sideOneScore = :v, sideTwoScore = :w, sideOneTimeouts = :a, sideTwoTimeouts = :b, sideOneFouls = :c, sideTwoFouls = :d, sideOneTheme = :g, sideTwoTheme = :h, sideOneMatchTheme = :i, sideTwoMatchTheme = :j, displayPosition = :k, countingDown = :e, showStopwatch = :x, periodIntervalSeconds = :y, periodMark = :z"),
            ExpressionAttributeValues: {
                ":r": document.getElementById("gameName").value,
                ":s": document.getElementById("showGame").checked,
                ":f": document.getElementById("showBasketballStats").checked,
                ":t": document.getElementById("side_1-name-scores").value,
                ":u": document.getElementById("side_2-name-scores").value,
                ":v": parseInt(document.getElementById("side_1-score").value),
                ":w": parseInt(document.getElementById("side_2-score").value),
                ":a": parseInt(document.getElementById("side_1-timeouts").value),
                ":b": parseInt(document.getElementById("side_2-timeouts").value),
                ":c": parseInt(document.getElementById("side_1-fouls").value),
                ":d": parseInt(document.getElementById("side_2-fouls").value),
                ":g": sideOneTheme,
                ":h": sideTwoTheme,
                ":i": document.getElementById("side_1-matchTheme").checked,
                ":j": document.getElementById("side_2-matchTheme").checked,
                ":k": document.getElementById("score_position").value,
                ":e": document.getElementById("countingDown").checked,
                ":x": document.getElementById("showStopwatch").checked,
                ":y": parseInt(document.getElementById("periodInterval").value),
                ":z": document.getElementById("periodMark").value,

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

        var theme_school = document.getElementById("theme_color_school").value
        var theme_order = document.getElementById("theme_color_order").value
        var combined_theme = `${theme_school}_${theme_order}`

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
                ":v": combined_theme
            },
            ReturnValues: "UPDATED_NEW"
          };
          
        dynamoClient.update(params, function(err, data) {});

        await new Promise(r => setTimeout(r, 500));

        document.getElementById("saveValues").innerText = "Save Values"
        document.getElementById("saveValues").style.removeProperty("background-color")
    }

    document.getElementById("side_1-plusOne").onclick = async function() {
        var score = parseInt(document.getElementById("side_1-score").value);
        
        score += 1;
        if (score < 0) {
            score = 0
        }

        document.getElementById("side_1-score").value = score;
        changeScore(1, score)
    }

    document.getElementById("side_1-plusTwo").onclick = async function() {
        var score = parseInt(document.getElementById("side_1-score").value);
        
        score += 2;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_1-score").value = score;
        changeScore(1, score)
    }

    document.getElementById("side_1-plusThree").onclick = async function() {
        var score = parseInt(document.getElementById("side_1-score").value);
        
        score += 3;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_1-score").value = score;
        changeScore(1, score)
    }

    document.getElementById("side_2-plusOne").onclick = async function() {
        var score = parseInt(document.getElementById("side_2-score").value);
        
        score += 1;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_2-score").value = score;
        changeScore(2, score)
    }

    document.getElementById("side_2-plusTwo").onclick = async function() {
        var score = parseInt(document.getElementById("side_2-score").value);
        
        score += 2;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_2-score").value = score;
        changeScore(2, score)
    }

    document.getElementById("side_2-plusThree").onclick = async function() {
        var score = parseInt(document.getElementById("side_2-score").value);
        
        score += 3;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_2-score").value = score;
        changeScore(2, score)
    }

    document.getElementById("side_1-minusOne").onclick = async function() {
        var score = parseInt(document.getElementById("side_1-score").value);
        
        score -= 1;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_1-score").value = score;
        changeScore(1, score)
    }

    document.getElementById("side_1-minusTwo").onclick = async function() {
        var score = parseInt(document.getElementById("side_1-score").value);
        
        score -= 2;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_1-score").value = score;
        changeScore(1, score)
    }

    document.getElementById("side_1-minusThree").onclick = async function() {
        var score = parseInt(document.getElementById("side_1-score").value);
        
        score -= 3;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_1-score").value = score;
        changeScore(1, score)
    }

    document.getElementById("side_2-minusOne").onclick = async function() {
        var score = parseInt(document.getElementById("side_2-score").value);
        
        score -= 1;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_2-score").value = score;
        changeScore(2, score)
    }

    document.getElementById("side_2-minusTwo").onclick = async function() {
        var score = parseInt(document.getElementById("side_2-score").value);
        
        score -= 2;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_2-score").value = score;
        changeScore(2, score)
    }

    document.getElementById("side_2-minusThree").onclick = async function() {
        var score = parseInt(document.getElementById("side_2-score").value);
        
        score -= 3;
        if (score < 0) {
            score = 0
        }


        document.getElementById("side_2-score").value = score;
        changeScore(2, score)
    }

    document.getElementById("side_1-matchTheme").onclick = async function() {
        document.getElementById("side_1-theme").disabled = document.getElementById("side_1-matchTheme").checked
    }
    
    document.getElementById("side_2-matchTheme").onclick = async function() {
        document.getElementById("side_2-theme").disabled = document.getElementById("side_2-matchTheme").checked
    }

    document.getElementById("side_1-zero").onclick = async function() {
        document.getElementById("side_1-score").value = 0
        document.getElementById("side_1-fouls").value = 0
        document.getElementById("side_1-timeouts").value = 0
    }

    document.getElementById("side_2-zero").onclick = async function() {
        document.getElementById("side_2-score").value = 0
        document.getElementById("side_2-fouls").value = 0
        document.getElementById("side_2-timeouts").value = 0
    }

    document.getElementById("slaveModeEnabled").onclick = async function() {
        if (document.getElementById("slaveModeEnabled").checked) {
            document.getElementById('blurrableElement').classList.add("blur");
            intervalId = setInterval(function() {document.getElementById('colorDiv').innerHTML = ""; fetchData()}, 500);
        } else {
            if (intervalId) {
                clearInterval(intervalId)
            }
            document.getElementById('blurrableElement').classList.remove("blur");
        }
    }

    document.getElementById('file-upload').addEventListener('change', (event) => {
        if (event.target.files.length == 0 ) {
            document.getElementById('upload-file-button').disabled = true;
            return;
        }
        var size = event.target.files[0].size
        if (size > 200000) {
            window.parent.postMessage({
                type: "show-alert",
                licenseError: false,
                message: "File size too big. Limit sizes to 200 kB. Recommended icon resolution is 200x200 pixels"
            }, "*");
            event.target.value = "";
            document.getElementById('upload-file-button').disabled = true;
        } else {
            document.getElementById('upload-file-button').disabled = false;
        };
    });

    document.getElementById('upload-file-button').addEventListener('click', async (event) => {
        var file = document.getElementById('file-upload').files[0];
        var fileName = file.name;
        var fileType = file.type;
        var fileBuffer = await file.arrayBuffer();
        event.target.disabled = true;
        event.target.innerText = "Uploading..."
        var file = document.getElementById('file-upload').disabled = true;
        
        s3Client.putObject({
            Bucket: parsedBaseUrl.bucket,
            Key: parsedBaseUrl.key + fileName,
            Body: fileBuffer,
            ContentType: fileType
        }, async (err, data) => {
            if (err) {
                console.error(err)
            } else {
                console.log('Uploaded successfully!', data);
                event.target.innerText = "Upload Successful!"
                event.target.style.backgroundColor = "green"
                event.target.style.borderColor = "green"
                document.getElementById('file-upload').value = "";
                document.getElementById('file-upload').disabled = false;
                
                var imagePickers = document.getElementsByClassName('image-picker')

                for (var p = 0; p < imagePickers.length; p++) {
                    var showKey = fileName
                    var option = document.createElement('option')
                    option.value = `s3://${parsedBaseUrl.bucket}/${parsedBaseUrl.key + fileName}`
                    option.innerHTML = showKey
                    imagePickers[p].appendChild(option)
                }

                await sleep(1000)
                event.target.innerText = "Upload Image"
                event.target.style.backgroundColor = ""
                event.target.style.borderColor = ""
            }
        });
    });
}

function changeScore(side, value) {
    var sideText;
    if (side == 1) {
        sideText = "sideOneScore"
    } else {
        sideText = "sideTwoScore"
    }
    var params = {
        TableName: tableName,
        Key: {
            "valueId": "gameScreen"
        },
        UpdateExpression: (`set ${sideText} = :v`),
        ExpressionAttributeValues: {
            ":v": value,
        },
        ReturnValues: "UPDATED_NEW"
        };
        
    dynamoClient.update(params, function(err, data) {});
}


var docDataTempTemp;
var docDataTemp = {};
var colors = {};
var dynamoS3Locations = {};
var s3AllObjects = {};
var docData = {};

function fetchData() {
    tableName = document.getElementById("serverName").value;
    const params = {
        TableName: tableName,
    };

    dynamodb.scan(params, function(err, data) {
        if (err) {
            console.error("Error fetching data from DynamoDB:", err);
            if (err.code == "AccessDeniedException") {
                document.getElementById('blurrableElement').classList.add("blur");
                document.getElementById('serverStatus').style.color = "red"
                document.getElementById('serverStatus').innerText = "Access Denied/Doesn't Exist"
            } else if (err.code == "ValidationException") {
                document.getElementById('blurrableElement').classList.add("blur");
                document.getElementById('serverStatus').style.color = "red"
                document.getElementById('serverStatus').innerText = "Enter Database ID and Sync"
            }
        } else {
            if (document.getElementById('slaveModeEnabled').checked == false) {
                document.getElementById('blurrableElement').classList.remove("blur");
            }
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

async function updateData() {
    dynamoS3Locations = {};
    s3AllObjects = {};

    docData = {
        "team_1" : docDataTemp['gameScreen']['sideOneName'].S,
        "team_2" : docDataTemp['gameScreen']['sideTwoName'].S,
        "team_1s" : docDataTemp['gameScreen']['sideOneScore'].N,
        "team_2s" : docDataTemp['gameScreen']['sideTwoScore'].N,
        "team_1_theme" : docDataTemp['gameScreen']['sideOneTheme'].S,
        "team_2_theme" : docDataTemp['gameScreen']['sideTwoTheme'].S,
        "team_1_match-theme" : docDataTemp['gameScreen']['sideOneMatchTheme'].BOOL,
        "team_2_match-theme" : docDataTemp['gameScreen']['sideTwoMatchTheme'].BOOL,
        "team_1_tos" : docDataTemp['gameScreen']['sideOneTimeouts'].N,
        "team_2_tos" : docDataTemp['gameScreen']['sideTwoTimeouts'].N,
        "team_1_fouls" : docDataTemp['gameScreen']['sideOneFouls'].N,
        "team_2_fouls" : docDataTemp['gameScreen']['sideTwoFouls'].N,
        "gameName_1" : docDataTemp['gameScreen']['gameName'].S,
        "hide_1" : docDataTemp['gameScreen']['showScore'].BOOL,
        "showBasketballStats" : docDataTemp['gameScreen']['showBasketballStats'].BOOL,
        "stopwatchms" : docDataTemp['gameScreen']['stopwatchValueMs'].N,
        "stopwatchrunning" : docDataTemp['gameScreen']['stopwatchRunning'].BOOL,
        "startedAt" : docDataTemp['gameScreen']['stopwatchStartedAt'].N,
        "countingDown" : docDataTemp['gameScreen']['countingDown'].BOOL,
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
        "themeSchool" : docDataTemp['startingSoon']['themeSchool'].S,
        "displayPosition" : docDataTemp['gameScreen']['displayPosition'].S
    }

    schools = [];

    parsedBaseUrl = parseS3Url(s3BaseLocation)

    var unmodifiedAvailableIcons = await listObjectsInDirectory(parsedBaseUrl.bucket, parsedBaseUrl.key)
    for (var i = 0; i < unmodifiedAvailableIcons.length; i++) {
        if (unmodifiedAvailableIcons[i].Size <= 0) {
            continue;
        }
        var separatedS3Url = unmodifiedAvailableIcons[i].Key.split('/')
        s3AllObjects[separatedS3Url[separatedS3Url.length - 1]] = s3BaseLocation + separatedS3Url[separatedS3Url.length - 1]
    }
    
    for (var i = 0; i < Object.keys(docDataTemp['primaryColors']).length; i++) {
        var schoolCode = Object.keys(docDataTemp['primaryColors'])[i];
        if (schoolCode == "valueId") {
            continue;
        }
        dynamoS3Locations[schoolCode] = docDataTemp['schoolIconURL'][schoolCode].S;
    }

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
            schoolName_2.innerText = schoolCode.toUpperCase();

            schoolName_1.appendChild(schoolName_2);
            schoolName_0.appendChild(schoolName_1);

            var schoolDd = document.createElement("dd");
            schoolDd.style['display'] = "flex";
            schoolDd.style['align-items'] = "center";
            schoolDd.classList = "schoolDd"
            schoolDd.id = schoolCode

            var primaryDiv = document.createElement("div");
            primaryDiv.classList.add("inputGroup", "inputGroup--joined");
            var spanDiv = document.createElement("span");
            spanDiv.classList.add("inputGroup-text");
            spanDiv.innerText = "Primary";
            spanDiv.style['width'] = '100px';
            var inputDiv = document.createElement("input");
            inputDiv.type = "text";
            inputDiv.classList.add("input", "texts", "t1", "color-input");
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
            secondaryspanDiv.style['width'] = '100px';
            secondaryinputDiv.classList.add("input", "texts", "t1", "color-input");
            secondaryinputDiv.id = schoolCode + "Secondary";
            var secondaryexampleDiv = document.createElement("div");
            secondaryexampleDiv.classList.add("color-picker");
            secondaryexampleDiv.id = schoolCode + "SecondaryColor";

            secondaryDiv.appendChild(secondaryspanDiv);
            secondaryDiv.appendChild(secondaryinputDiv);
            secondaryDiv.appendChild(secondaryexampleDiv);

            var surroundingDiv = document.createElement("div")
            surroundingDiv.style['flex-direction'] = "column"
            surroundingDiv.style['display'] = "flex"
            surroundingDiv.style['gap'] = "10px"
            surroundingDiv.style['width'] = "100%"
            surroundingDiv.appendChild(primaryDiv)
            surroundingDiv.appendChild(secondaryDiv)

            var imageDisplay = document.createElement('img')
            imageDisplay.classList = 'image-display'
            var imageBuffer = await getObjectFromS3Url(dynamoS3Locations[schoolCode])
            const base64 = imageBuffer.toString('base64');
            const mimeType = "image/png"; // or detect dynamically
            const dataUrl = `data:${mimeType};base64,${base64}`;
            imageDisplay.src = `${dataUrl}`


            var imagePicker = document.createElement('select')
            imagePicker.id = schoolCode + '-icon_picker'

            for (var a = 0; a < Object.keys(s3AllObjects).length; a++) {
                var showKey = Object.keys(s3AllObjects)[a]
                var option = document.createElement('option')
                option.value = s3AllObjects[showKey]
                option.innerHTML = showKey
                imagePicker.appendChild(option)
            }

            imagePicker.classList = "input texts t1 image-picker"
            imagePicker.value = dynamoS3Locations[schoolCode]

            imagePicker.addEventListener('change', async (event) => {
                var selector = event.target
                var parentElement = selector.parentElement



                var imageDisplay = document.createElement('img')
                imageDisplay.classList = 'image-display'
                var imageBuffer = await getObjectFromS3Url(selector.value)
                const base64 = imageBuffer.toString('base64');
                const mimeType = "image/png"; 
                const dataUrl = `data:${mimeType};base64,${base64}`;
                parentElement.getElementsByClassName('image-display')[0].src = `${dataUrl}`
            });

            var deleteIconButton = document.createElement('button');
            deleteIconButton.classList = "button";
            deleteIconButton.style['margin-left'] = '10px';
            deleteIconButton.innerText = "Delete Image";

            deleteIconButton.addEventListener('click', async (event) => {
                var parentDiv = event.target.parentElement
                var schoolCode = parentDiv.id

                var selector = parentDiv.getElementsByTagName('select')[0]
                var parsedUrl = parseS3Url(selector.value)
                var affixedS3url = selector.value

                await s3Client.deleteObject({
                    Bucket: parsedBaseUrl.bucket,
                    Key: parsedUrl.key
                }).promise();


                var allSelectsWithThisImage = [...document.querySelectorAll("select")]
                    .filter(sel => sel.value === affixedS3url);

                var allIconSelectors = document.getElementsByClassName('image-picker')
                for (var a = 0; a < allIconSelectors.length; a++) {
                    var specificSelect = allIconSelectors[a]
                    const option = specificSelect.querySelector(`option[value="${affixedS3url}"]`);
                    if (option) option.remove();
                }
                for (var a = 0; a < allSelectsWithThisImage.length; a++) {
                    selector = allSelectsWithThisImage[a]
                    selector.value = selector.children[0].value

                    var parentElement = selector.parentElement

                    var imageDisplay = document.createElement('img')
                    imageDisplay.classList = 'image-display'
                    var imageBuffer = await getObjectFromS3Url(selector.value)
                    const base64 = imageBuffer.toString('base64');
                    const mimeType = "image/png"; 
                    const dataUrl = `data:${mimeType};base64,${base64}`;
                    parentElement.getElementsByClassName('image-display')[0].src = `${dataUrl}`

                    var params = {
                        TableName: tableName,
                        Key: {
                        "valueId": "schoolIconURL"
                        },
                        UpdateExpression: (`set ${parentElement.id} = :r`),
                        ExpressionAttributeValues: {
                            ":r": selector.value
                        },
                        ReturnValues: "UPDATED_NEW"
                    };
                    
                    dynamoClient.update(params, function(err, data) {});
                }
            });

            var deleteSchoolButton = document.createElement('button');
            deleteSchoolButton.classList = "button";
            deleteSchoolButton.style['margin-left'] = '10px';
            deleteSchoolButton.innerText = "Delete School";
            deleteSchoolButton.style['background-color'] = "#27597dff"

            deleteSchoolButton.addEventListener('click', async (event) => {
                var schoolCode = event.target.parentElement.id

                var params = {
                    TableName: tableName,
                    Key: {
                        valueId: "primaryColors"
                    },
                    UpdateExpression: `REMOVE #a`,
                    ExpressionAttributeNames: {
                        "#a": schoolCode
                    }
                };

                await dynamoClient.update(params).promise();

                params = {
                    TableName: tableName,
                    Key: {
                        valueId: "secondaryColors"
                    },
                    UpdateExpression: `REMOVE #a`,
                    ExpressionAttributeNames: {
                        "#a": schoolCode
                    }
                };

                await dynamoClient.update(params).promise();

                params = {
                    TableName: tableName,
                    Key: {
                        valueId: "schoolIconURL"
                    },
                    UpdateExpression: `REMOVE #a`,
                    ExpressionAttributeNames: {
                        "#a": schoolCode
                    }
                };

                await dynamoClient.update(params).promise();
            

                var themeOptions = document.querySelectorAll(`option[value=${schoolCode.toUpperCase()}]`)
                themeOptions.forEach((theme) => {
                    theme.remove()
                })

                if (schoolCode == document.getElementById('theme_color_school').value) {
                    document.getElementById('theme_color_school').value = document.getElementById('theme_color_school').options[0].value
                }

                event.target.parentElement.parentElement.remove()

                document.getElementById("saveValues").innerText = "Save Successful"
                document.getElementById("saveValues").style.backgroundColor = "green"
                var choiceIds = ["eventScene"];
                var toggleIds = ["showEvent"];

                const index = schools.indexOf(schoolCode);
                if (index > -1) {
                    schools.splice(index, 1);
                }


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

                var colorInputs = document.getElementsByClassName('color-input')
                Array.from(colorInputs).forEach((colorInput) => {
                    colorInput.parentElement.getElementsByClassName('color-picker')[0].style['background-color'] = colorInput.value
                });

                var schoolImageDivs = document.getElementsByClassName('schoolDd')

                var newIconMatchings = {};
                for (var s = 0; s < schoolImageDivs.length; s++) {
                    var div = schoolImageDivs[s]
                    var divSchoolCode = div.id
                    var selectedImage = div.getElementsByClassName('image-picker')[0].value

                    var params = {
                        TableName: tableName,
                        Key: {
                        "valueId": "schoolIconURL"
                        },
                        UpdateExpression: (`set ${divSchoolCode} = :r`),
                        ExpressionAttributeValues: {
                            ":r": selectedImage
                        },
                        ReturnValues: "UPDATED_NEW"
                    };
                    
                    dynamoClient.update(params, function(err, data) {});
                }

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

                var sideOneTheme;
                var sideTwoTheme;

                if (document.getElementById("side_1-matchTheme").checked) {
                    sideOneTheme = document.getElementById("side_1-name-scores").value
                    var opts = document.getElementById("side_1-theme").options
                    const vals = Array.from(opts)
                        .map(el => el.value.toLowerCase()); 
                    if (vals.includes(sideOneTheme.toLowerCase())) {
                        document.getElementById("side_1-theme").value = sideOneTheme.toUpperCase()
                    } else {
                        sideOneTheme = document.getElementById("side_1-theme").value
                        document.getElementById("side_1-matchTheme").checked = false
                        document.getElementById("side_1-theme").disabled = false
                    }
                } else {
                    sideOneTheme = document.getElementById("side_1-theme").value
                }
                if (document.getElementById("side_2-matchTheme").checked) {
                    sideTwoTheme = document.getElementById("side_2-name-scores").value
                    var opts = document.getElementById("side_2-theme").options
                    const vals = Array.from(opts)
                        .map(el => el.value.toLowerCase()); 
                    if (vals.includes(sideTwoTheme.toLowerCase())) {
                        document.getElementById("side_2-theme").value = sideTwoTheme.toUpperCase()
                    } else {
                        sideTwoTheme = document.getElementById("side_2-theme").value
                        document.getElementById("side_2-matchTheme").checked = false
                        document.getElementById("side_2-theme").disabled = false
                    }
                } else {
                    sideTwoTheme = document.getElementById("side_2-theme").value
                }

                

                var params = {
                    TableName: tableName,
                    Key: {
                    "valueId": "gameScreen"
                    },
                    UpdateExpression: ("set gameName = :r, showScore = :s, showBasketballStats = :f, sideOneName = :t, sideTwoName = :u, sideOneScore = :v, sideTwoScore = :w, sideOneTimeouts = :a, sideTwoTimeouts = :b, sideOneFouls = :c, sideTwoFouls = :d, sideOneTheme = :g, sideTwoTheme = :h, sideOneMatchTheme = :i, sideTwoMatchTheme = :j, displayPosition = :k, countingDown = :e, showStopwatch = :x, periodIntervalSeconds = :y, periodMark = :z"),
                    ExpressionAttributeValues: {
                        ":r": document.getElementById("gameName").value,
                        ":s": document.getElementById("showGame").checked,
                        ":f": document.getElementById("showBasketballStats").checked,
                        ":t": document.getElementById("side_1-name-scores").value,
                        ":u": document.getElementById("side_2-name-scores").value,
                        ":v": parseInt(document.getElementById("side_1-score").value),
                        ":w": parseInt(document.getElementById("side_2-score").value),
                        ":a": parseInt(document.getElementById("side_1-timeouts").value),
                        ":b": parseInt(document.getElementById("side_2-timeouts").value),
                        ":c": parseInt(document.getElementById("side_1-fouls").value),
                        ":d": parseInt(document.getElementById("side_2-fouls").value),
                        ":g": sideOneTheme,
                        ":h": sideTwoTheme,
                        ":i": document.getElementById("side_1-matchTheme").checked,
                        ":j": document.getElementById("side_2-matchTheme").checked,
                        ":k": document.getElementById("score_position").value,
                        ":e": document.getElementById("countingDown").checked,
                        ":x": document.getElementById("showStopwatch").checked,
                        ":y": parseInt(document.getElementById("periodInterval").value),
                        ":z": document.getElementById("periodMark").value,

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

                var theme_school = document.getElementById("theme_color_school").value
                var theme_order = document.getElementById("theme_color_order").value
                var combined_theme = `${theme_school}_${theme_order}`

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
                        ":v": combined_theme
                    },
                    ReturnValues: "UPDATED_NEW"
                };
                
                dynamoClient.update(params, function(err, data) {});

                await new Promise(r => setTimeout(r, 500));

                document.getElementById("saveValues").innerText = "Save Values"
                document.getElementById("saveValues").style.removeProperty("background-color")

                document.getElementById('colorDiv').innerHTML = "";
                fetchData()
            });
            
            schoolDd.appendChild(surroundingDiv);
            schoolDd.appendChild(imageDisplay)
            schoolDd.appendChild(imagePicker)
            schoolDd.appendChild(deleteIconButton)
            schoolDd.appendChild(deleteSchoolButton)

            schoolDiv.appendChild(schoolName_0);
            schoolDiv.appendChild(schoolDd);

            colorDiv.insertBefore(schoolDiv, document.getElementsByClassName('new-school-button-container')[0]);

            var separator = document.createElement("hr");
            separator.classList.add("formRowSep");
            colorDiv.insertBefore(separator, document.getElementsByClassName('new-school-button-container')[0]);

        }
    }

    var newSchoolButtonDiv = document.createElement("div")
    newSchoolButtonDiv.classList = "new-school-button-container"
    var newSchoolButton = document.createElement("button")
    newSchoolButton.classList = "new-school-button button"
    newSchoolButton.innerText = "+"

    newSchoolButton.addEventListener('click', async (event) => {
        var schoolCode = document.getElementById("new-school-name-input").value.toLowerCase()
        if (schools.includes(schoolCode)) {
            window.parent.postMessage({
                type: "show-alert",
                licenseError: false,
                message: `School with acronym '${document.getElementById("new-school-name-input").value}' already exists.`
            }, "*");
            document.getElementById("new-school-name-input").value = ""
            return;
        }
        
        var params = {
            TableName: tableName,
            Key: {
                "valueId": "primaryColors"
            },
            UpdateExpression: ("set " + schoolCode + " = :r"),
            ExpressionAttributeValues: {
                ":r": "#000000",

            },
            ReturnValues: "UPDATED_NEW"
        };
            
        dynamoClient.update(params, function(err, data) {});

        var params = {
            TableName: tableName,
            Key: {
                "valueId": "secondaryColors"
            },
            UpdateExpression: ("set " + schoolCode + " = :r"),
            ExpressionAttributeValues: {
                ":r": "#000000",

            },
            ReturnValues: "UPDATED_NEW"
            };
            
        dynamoClient.update(params, function(err, data) {});

        var params = {
            TableName: tableName,
            Key: {
            "valueId": "schoolIconURL"
            },
            UpdateExpression: (`set ${schoolCode} = :r`),
            ExpressionAttributeValues: {
                ":r": dynamoS3Locations[schools[0]]
            },
            ReturnValues: "UPDATED_NEW"
        };
        
        dynamoClient.update(params, function(err, data) {
            if (!err) {
                document.getElementById('colorDiv').innerHTML = "";
                fetchData();
            }
        });
    });

    var newSchoolNameInput = document.createElement("input")
    newSchoolNameInput.classList = "new-school-input"
    newSchoolNameInput.id = "new-school-name-input"
    newSchoolNameInput.maxLength = 10;
    var nameLabel = document.createElement('span')
    nameLabel.innerText = "Enter New School Acronym: "
    
    newSchoolButtonDiv.appendChild(nameLabel)
    newSchoolButtonDiv.appendChild(newSchoolNameInput)
    newSchoolButtonDiv.appendChild(newSchoolButton)
    colorDiv.appendChild(newSchoolButtonDiv)

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
    var splitTheme = docData["themeSchool"].split("_")
    document.getElementById("theme_color_school").value = splitTheme[0];
    document.getElementById("theme_color_order").value = splitTheme[1];

    //Team Scores
    document.getElementById("side_1-name-scores").value = docData["team_1"];
    document.getElementById("side_2-name-scores").value = docData["team_2"];

    document.getElementById("side_1-score").value = docData["team_1s"];
    document.getElementById("side_2-score").value = docData["team_2s"];

    document.getElementById("side_1-theme").value = docData["team_1_theme"];
    document.getElementById("side_2-theme").value = docData["team_2_theme"];
    document.getElementById("side_1-matchTheme").checked = docData["team_1_match-theme"];
    document.getElementById("side_2-matchTheme").checked = docData["team_2_match-theme"];

    document.getElementById("side_1-theme").disabled = docData["team_1_match-theme"]
    document.getElementById("side_2-theme").disabled = docData["team_2_match-theme"]

    document.getElementById("side_1-fouls").value = docData["team_1_fouls"];
    document.getElementById("side_1-timeouts").value = docData["team_1_tos"];
    document.getElementById("side_2-fouls").value = docData["team_2_fouls"];
    document.getElementById("side_2-timeouts").value = docData["team_2_tos"];
    

    document.getElementById("gameName").value = docData["gameName_1"];

    document.getElementById("showGame").checked = docData["hide_1"];
    document.getElementById("showBasketballStats").checked = docData["showBasketballStats"];

    //Stopwatch
    if (document.getElementById("valueMs").value == "Loading...") {
        document.getElementById("valueMs").value = "0 h : 0 m : 0 s : 000 ms"
    }
    document.getElementById("periodInterval").value = docData["periodIntervalSeconds"];
    document.getElementById("periodMark").value = docData["periodMark"];
    document.getElementById("showStopwatch").checked = docData["showStopwatch"];
    document.getElementById("countingDown").checked = docData["countingDown"];

    initStopwatch();

    if (document.getElementById('slaveModeEnabled') == false) {
        document.getElementById("blurrableElement").classList.remove("blur");
    }

    var themeOneSelector = document.getElementById("side_1-theme")
    document.getElementById("side_1-theme").innerHTML = ""
    schools.forEach((school) => {
        var option = document.createElement('option')
        option.value = school.toUpperCase()
        option.innerText = school.toUpperCase()
        themeOneSelector.appendChild(option)
    });
    themeOneSelector.value = docData['team_1_theme']

    var themeTwoSelector = document.getElementById("side_2-theme")
    document.getElementById("side_2-theme").innerHTML = ""
    schools.forEach((school) => {
        var option = document.createElement('option')
        option.value = school.toUpperCase()
        option.innerText = school.toUpperCase()
        themeTwoSelector.appendChild(option)
    });
    themeTwoSelector.value = docData['team_2_theme']

    var countdownThemeSelector = document.getElementById("theme_color_school")
    document.getElementById("theme_color_school").innerHTML = ""
    schools.forEach((school) => {
        var option = document.createElement('option')
        option.value = school.toLowerCase()
        option.innerText = school.toUpperCase()
        countdownThemeSelector.appendChild(option)
    });
    var splitTheme = docData["themeSchool"].split("_")
    countdownThemeSelector.value = splitTheme[0];

    document.getElementById("score_position").value = docData['displayPosition']
}

var countingDown; /* If true, count the stopwatch down, if false, count up */
var stopwatchStarted;
var startOfStopwatch;
var addedTime = 0;

function initStopwatch() {
    countingDown = docData["countingDown"];
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
                    ":s": startOfStopwatch - addedTime * ((document.getElementById("countingDown").checked) ? -1 : 1),
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
    countingDown = document.getElementById("countingDown").checked

    if (document.getElementById("valueMs").value == "") {
        document.getElementById("valueMs").value = "0 h : 0 m : 0 s : 000 ms"
    }

    while (stopwatchStarted) {
        timeoutInterval--;
        var ms;
        
        // Calculate time based on counting direction
        if (countingDown) {
            // Countdown: subtract elapsed time from the initial value
            ms = addedTime - (Date.now() - startOfStopwatch);
            
            // Stop at zero when counting down
            if (ms <= 0) {
                ms = 0;
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
                        ":v": 0
                    },
                    ReturnValues: "UPDATED_NEW"
                  };
                  
                dynamoClient.update(params, function(err, data) {});
                document.getElementById("valueMs").value = "0 h : 0 m : 0 s : 000 ms"
                continue;
            }
        } else {
            // Count up: add elapsed time to the initial value
            ms = (Date.now() - startOfStopwatch) + addedTime;
        }
        
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

function parseS3Url(s3Url) {
  const match = s3Url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
  if (!match) throw new Error("Invalid S3 URL");
  return { bucket: match[1], key: match[2] };
}

async function getObjectFromS3Url(s3Url) {
  const { bucket, key } = parseS3Url(s3Url);

  const result = await s3Client.getObject({
    Bucket: bucket,
    Key: key
  }).promise();

  return result.Body;
};

async function setBaseUrl(s3Url) {
    var initialSplit = s3Url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
    var uriSplit = initialSplit[2].split('/')
    var string = `s3://${initialSplit[1]}/${uriSplit[0]}`
    
    baseUrl = string
}

async function listObjectsInDirectory(bucket, directory) {
  const prefix = directory.endsWith("/") ? directory : directory + "/";

  const params = {
    Bucket: bucket,
    Prefix: prefix,
  };

  const result = await s3Client.listObjectsV2(params).promise();
  return result.Contents; // array of objects
}

async function uploadFileToS3(filePath, bucketName, key) {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: bucketName,
    Key: key,           
    Body: fileContent,
    ACL: 'public-read',
    ContentType: 'image/png'
  };

  try {
    const result = await s3.upload(params).promise();
    console.log('Upload successful:', result.Location);
    return result.Location;
  } catch (err) {
    console.error('Upload failed:', err);
    throw err;
  }
}

function isValidHex(str) {
    return /^#[0-9A-Fa-f]{6}$/.test(str);
}