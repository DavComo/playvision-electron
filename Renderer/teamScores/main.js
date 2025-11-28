var schools = [];

//Initiate Data
(function(window, document, undefined) {
  
    window.onload = init();

})(window, document, undefined);

var dynamodb;
var dynamoClient;
var docDataTempTemp;
var streamData;

async function fetchData() {
    var dbName = (await getConfig()).dbName
    const params = {
        TableName: dbName,
    };

    dynamodb.scan(params, function(err, data) {
        if (err) {
            console.error("Error fetching data from DynamoDB:", err);
            if (err.code == "AccessDeniedException") {
                window.location.replace('http://localhost:5500/.401.html')
            } else if (err.code == "ValidationException") {
                window.location.replace('http://localhost:5500/.404.html')
            }
        } else {
            // Update the UI with the fetched data
            docDataTempTemp = data.Items;
            updateData()
        }
    });
}

async function getConfig() {
    const res = await fetch('/stream-config') // same origin as your HTML
    if (!res.ok) throw new Error('Failed to load config')
    const cfg = await res.json()

    return cfg
}

async function init() {
    streamData = await getConfig()
    // Initialize AWS SDK and DynamoDB client
    AWS.config.update({
        region: streamData.awsRegion,
        accessKeyId: streamData.accessKey,
        secretAccessKey: streamData.secretKey
    });

    dynamodb = new AWS.DynamoDB();
    dynamoClient = new AWS.DynamoDB.DocumentClient();

    var params = {
        TableName: streamData.dbName,
        Key: {
          "valueId": "clientStatuses"
        },
        UpdateExpression: "set teamScores = :r",
        ExpressionAttributeValues: {
            ":r": true,
        },
        ReturnValues: "UPDATED_NEW"
      };
      
    dynamoClient.update(params, function(err, data) {});

    window.addEventListener("beforeunload", function(e){
        var params = {
            TableName: tableName,
            Key: {
              "valueId": "clientStatuses"
            },
            UpdateExpression: "set teamScores = :r",
            ExpressionAttributeValues: {
                ":r": false,
            },
            ReturnValues: "UPDATED_NEW"
          };
          
        dynamoClient.update(params, function(err, data) {});
     });

    fetchData();
};


var docData = {};
var docDataTemp = {};
var colors = {};
//Update Data (Source js + refactoring)
async function updateData() {
    var deltaStart = Date.now();
    var minTimeout = 0;

    for (var index = 0; index < docDataTempTemp.length; index++) {
        var indexkey = docDataTempTemp[index].valueId.S;
        docDataTemp[indexkey] = docDataTempTemp[index];
    }

    docData = {
        "team_1" : docDataTemp['gameScreen']['sideOneName'].S,
        "team_2" : docDataTemp['gameScreen']['sideTwoName'].S,
        "team_1s" : docDataTemp['gameScreen']['sideOneScore'].N,
        "team_2s" : docDataTemp['gameScreen']['sideTwoScore'].N,
        "team_1_tos" : docDataTemp['gameScreen']['sideOneTimeouts'].N,
        "team_2_tos" : docDataTemp['gameScreen']['sideTwoTimeouts'].N,
        "team_1_fouls" : docDataTemp['gameScreen']['sideOneFouls'].N,
        "team_2_fouls" : docDataTemp['gameScreen']['sideTwoFouls'].N,
        "gameName_1" : docDataTemp['gameScreen']['gameName'].S,
        "hide_1" : !docDataTemp['gameScreen']['showScore'].BOOL,
        "showBasketballStats" : docDataTemp['gameScreen']['showBasketballStats'].BOOL,
        "stopwatchms" : docDataTemp['gameScreen']['stopwatchValueMs'].N,
        "stopwatchrunning" : docDataTemp['gameScreen']['stopwatchRunning'].BOOL,
        "startedAt" : docDataTemp['gameScreen']['stopwatchStartedAt'].N,
        "countingDown" : docDataTemp['gameScreen']['countingDown'].BOOL,
        "showStopwatch" : docDataTemp['gameScreen']['showStopwatch'].BOOL,
        "periodMark" : docDataTemp['gameScreen']['periodMark'].S
    }

    for (var i = 0; i < Object.keys(docDataTemp['primaryColors']).length; i++) {
        var schoolCode = Object.keys(docDataTemp['primaryColors'])[i];
        if (schoolCode != "valueId") {
            schools.push(schoolCode);
            colors[schoolCode + "_primary"] = docDataTemp['primaryColors'][schoolCode].S;
            colors[schoolCode + "_secondary"] = docDataTemp['secondaryColors'][schoolCode].S;
        }
    }

    updateStopwatch(docData);

    if (docData['hide_1'] == false) {
        if ($('#team_1').text() != docData['team_1'] || $('#team_2').text() != docData['team_2']) {
            minTimeout += 3000;
            await new Promise(resolve => { 
                $('body')
                    .queue(elemHide('.timeout.right'))
                    .queue(elemHide('.timeout.left')).delay(500)
                    .queue(elemHide('.top-container'))
                    .queue(elemHide('.stopwatch-container')).delay(500)
                    .queue(elemHide('.main-container')).delay(500)
                    .queue(updateSpecific('gameName', 'gameName_1'))
                    .queue(updateIcon('team_1_icon', docData['team_1']))
                    .queue(updateIcon('team_2_icon', docData['team_2']))
                    .queue(updateColors())
                    .queue(updateSpecific('team_1', 'team_1'))
                    .queue(updateSpecific('team_2', 'team_2'))
                    .queue(updateSpecific('team_1s', 'team_1s'))
                    .queue(updateSpecific('team_2s', 'team_2s'))
                    .queue(elemShow('.main-container')).delay(500)
                    .queue(elemShow('.stopwatch-container'))
                    .queue(elemShow('.top-container')).delay(500)
                    .queue(elemShow('.timeout.right'))
                    .queue(elemShow('.timeout.left'))
                    .queue(function(next) {
                        resolve();
                        next();
                    });
            });
        }

        $('body')
            .queue(updateSpecific('firstTimeouts', 'team_1_tos'))
            .queue(updateSpecific('secondTimeouts', 'team_2_tos'))
            .queue(updateSpecific('firstFouls', 'team_1_fouls'))
            .queue(updateSpecific('secondFouls', 'team_2_fouls'))

        if ($('#gameName').text() != docData['gameName_1']) {
            minTimeout += 1000;
            $('body')
                .queue(elemHide('.top-container')).delay(1000)
                .queue(updateSpecific('gameName', 'gameName_1'))
                .queue(elemShow('.top-container'))
        }

        if ($('#team_1s').text() != docData['team_1s'] || $('#team_2s').text() != docData['team_2s']) {
            $('body')
                .queue(updateSpecific('team_1s', 'team_1s'))
                .queue(updateSpecific('team_2s', 'team_2s'))
        }

        if ($('.main-container').hasClass('hidden')) {
            minTimeout += 1000;
            $('body')
                .queue(elemShow('.main-container')).delay(500)
                .queue(elemShow('.stopwatch-container'))
                .queue(elemShow('.top-container')).delay(500)
                .queue(elemShow('.timeout.right'))
                .queue(elemShow('.timeout.left'))
        }

        if (docData['showStopwatch'] == true) {
            if ($('.stopwatch-container').hasClass('hidden')) {
                minTimeout += 1000;
                $('body')
                    .queue(elemShow('.stopwatch-container'))
                
                if (docData['showBasketballStats'] == true) {
                    $('body')
                        .queue(elemShow('.timeout.left'))
                        .queue(elemShow('.timeout.right')).delay(500)
                }
            }
        } else {
            if (!$('.stopwatch-container').hasClass('hidden')) {
                minTimeout += 1000;
                $('body')
                    .queue(elemHide('.stopwatch-container'))
                    .queue(elemHide('.timeout.left'))
                    .queue(elemHide('.timeout.right')).delay(500)
            }
        }

        if (docData['showBasketballStats'] == true && docData['showStopwatch'] == true) {
            if ($('.timeout.left').hasClass('hidden')) {
                minTimeout += 1000;
                $('body')
                    .queue(elemShow('.timeout.left'))
                    .queue(elemShow('.timeout.right')).delay(500)
            }
        } else {
            if (!$('.timeout.left').hasClass('hidden')) {
                minTimeout += 1000;
                $('body')
                    .queue(elemHide('.timeout.left'))
                    .queue(elemHide('.timeout.right')).delay(500)
            }
        }
    } else {
        minTimeout += 1000;
        $('body')
            .queue(elemHide('.timeout.right'))
            .queue(elemHide('.timeout.left')).delay(500)
            .queue(elemHide('.top-container'))
            .queue(elemHide('.stopwatch-container')).delay(500)
            .queue(elemHide('.main-container'))
            .queue(updateSpecific('team_1', 'team_1'))
            .queue(updateIcon('team_1_icon', docData['team_1']))
            .queue(updateIcon('team_2_icon', docData['team_2']))
            .queue(updateColors())
            .queue(updateSpecific('team_2', 'team_2'))
            .queue(updateSpecific('team_1s', 'team_1s'))
            .queue(updateSpecific('team_2s', 'team_2s'))
    }

    var timeDelta = Date.now() - deltaStart;
    if (minTimeout < timeDelta) {
        minTimeout = timeDelta + 1000;
    }
    if (minTimeout < 1000) {
        minTimeout = 1000;
    }

    await sleep(minTimeout - timeDelta);
    fetchData();

}


//Package JS
var stopwatch = null;
var isShown = 0;
var scoreHidden = '0';

var mis = '#252C75';
var fis = '#A40033'
var ais = '#006C38'
var zis = '#EAAA02'

var formation1 = [];
var formation2 = [];

function elemHide(elem) {
	return function (next) {
		$(elem).addClass('fast hidden');
		next();
	}
}

function elemShow(elem) {
    if (elem != '.stopwatch-container') {
        return function (next) {
            $(elem).removeClass('fast hidden');	
            next();
        }
    } else {
        if (docData['showStopwatch'] == true) {
            return function (next) {
                $(elem).removeClass('fast hidden');	
                next();
            }
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateSpecific(htmlelem, docelem) {
	return function(next) {
		$('#' + htmlelem).text(docData[docelem]);
		next();
	}
}

function updateIcon(htmlelem, schoolName) {
    return function(next) {
        $('#' + htmlelem).attr('src', '/Renderer/teamScores/' + schoolName + '_Logo-200x200.png');
        next();
    }
}

function updateColors() {
    return function(next) {
        var schoolName_left = docData['team_1'];
        var schoolName_right = docData['team_2'];
        //Left side first
        $('#score-block-left').css('background-color', colors[schoolName_left.toLowerCase() + '_secondary']);
        $('#team_1').css('color', colors[schoolName_left.toLowerCase() + '_secondary']);

        $('#score-block-right').css('background-color', colors[schoolName_right.toLowerCase() + '_secondary']);
        $('#team_2').css('color', colors[schoolName_right.toLowerCase() + '_secondary']);

        var gradientCSS = 'linear-gradient(to right, ' + colors[schoolName_right.toLowerCase() + '_primary'] + ' 0%, ' + colors[schoolName_left.toLowerCase() + '_primary'] + ' 100%)'
        $('#top-colored').css('background', gradientCSS);
        $('#stopwatch-container').css('background', gradientCSS);

        $('#left-stats').css('background-color', colors[schoolName_left.toLowerCase() + '_secondary']);
        $('#right-stats').css('background-color', colors[schoolName_right.toLowerCase() + '_secondary']);
        next();
    }
}

/*Deprecated, view stopwatch.js for updated version*/
async function updateStopwatch() {
    document.getElementById('halfid').innerHTML = docData['periodMark'];

    if (docData['stopwatchrunning'] == false) {
        var timeinms = parseInt(docData['stopwatchms']) + 5;
        var seconds = Math.floor(timeinms / 1000) % 60;
        var minutes = Math.floor(timeinms / 60000);
        $('#stopwatch').text(String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'));
    } else {
        while (docData['stopwatchrunning'] == true) {
            var timeinms = Math.abs((docData['startedAt'] - Date.now()));
            if (timeinms < 0) {
                timeinms = 0;
            }
            var seconds = Math.floor(timeinms / 1000) % 60;
            var minutes = Math.floor(timeinms / 60000);
            $('#stopwatch').text(String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'));
            await sleep(10)
        }
    }
}