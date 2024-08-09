var schools = [];

//Initiate Data
(function(window, document, undefined) {
  
    window.onload = init();

})(window, document, undefined);

var dynamodb;
var dynamoClient;
var docDataTempTemp;

function fetchData() {
    const params = {
        TableName: streamData.dbName,
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

function init() {
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
        "gameName_1" : docDataTemp['gameScreen']['gameName'].S,
        "hide_1" : !docDataTemp['gameScreen']['showScore'].BOOL,
        "stopwatchms" : docDataTemp['gameScreen']['stopwatchValueMs'].N,
        "stopwatchrunning" : docDataTemp['gameScreen']['stopwatchRunning'].BOOL,
        "startedAt" : docDataTemp['gameScreen']['stopwatchStartedAt'].N,
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
        if ($('#gameName').text() != docData['gameName_1']) {
            minTimeout += 1000;
            $('body')
                .queue(elemHide('.top-container')).delay(1000)
                .queue(updateSpecific('gameName', 'gameName_1'))
                .queue(elemShow('.top-container'))
        }

        if ($('#team_1').text() != docData['team_1'] || $('#team_2').text() != docData['team_2']) {
            minTimeout += 3000;
            $('body')
                .queue(elemHide('.top-container')).delay(500)
                .queue(elemHide('.bottom-container')).delay(500)
                .queue(elemHide('.main-container')).delay(500)
                .queue(updateSpecific('team_1', 'team_1'))
                .queue(updateIcon('team_1_icon', docData['team_1']))
                .queue(updateIcon('team_2_icon', docData['team_2']))
                .queue(updateColors())
                .queue(updateSpecific('team_2', 'team_2'))
                .queue(updateSpecific('team_1s', 'team_1s'))
                .queue(updateSpecific('team_2s', 'team_2s'))
                .queue(elemShow('.main-container')).delay(500)
                .queue(elemShow('.bottom-container')).delay(500)
                .queue(elemShow('.top-container')).delay(500)
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
                .queue(elemShow('.bottom-container')).delay(500)
                .queue(elemShow('.top-container'))
        }

        if (docData['showStopwatch'] == true) {
            if ($('.bottom-container').hasClass('hidden')) {
                minTimeout += 1000;
                $('body')
                    .queue(elemShow('.bottom-container')).delay(500)
            }
        } else {
            if (!$('.bottom-container').hasClass('hidden')) {
                minTimeout += 1000;
                $('body')
                    .queue(elemHide('.bottom-container')).delay(500)
            }
        }
    } else {
        minTimeout += 1000;
        $('body')
            .queue(elemHide('.top-container')).delay(500)
            .queue(elemHide('.bottom-container')).delay(500)
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
    if (elem != '.bottom-container') {
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
        $('#' + htmlelem).attr('src', './' + schoolName + '_Logo-200x200.png');
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
        $('#bottom-colored').css('background', gradientCSS);
        next();
    }
}

/*Deprecated, view stopwatch.js for updated version*/
async function updateStopwatch() {
    document.getElementById('halfid').innerHTML = docData['periodMark'];

    if (docData['stopwatchrunning'] == false) {
        var timeinms = parseInt(docData['stopwatchms']) + 5;
        var seconds = Math.floor(timeinms / 1000) % 60;
        var minutes = Math.floor(timeinms / 60000) % 60;
        $('#stopwatch').text(String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'));
    } else {
        while (docData['stopwatchrunning'] == true) {
            var timeinms = Date.now() - docData['startedAt'];
            if (timeinms < 0) {
                timeinms = 0;
            }
            var seconds = Math.floor(timeinms / 1000) % 60;
            var minutes = Math.floor(timeinms / 60000) % 60;
            $('#stopwatch').text(String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'));
            await sleep(10)
        }
    }
}