import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getDatabase, ref, onValue, child, get, set, onDisconnect } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-database.js";

var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.6.3.min.js'; // Check https://jquery.com/ for the current version
document.getElementsByTagName('head')[0].appendChild(script);

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
    fetchData();
};


var docData = {};
var docDataTemp = {};
var colors;

var currentScene;
var currentStatus;
//Update Data (Source js + refactoring)
async function updateData() {
    for (var index = 0; index < docDataTempTemp.length; index++) {
        var indexkey = docDataTempTemp[index].valueId.S;
        docDataTemp[indexkey] = docDataTempTemp[index];
    }

    docData = {
        "eventName_1" : docDataTemp['eventClassifier']['eventName'].S,
        "eventScene_1" : docDataTemp['eventClassifier']['eventScene'].S,
        "showEvent" : docDataTemp['eventClassifier']['showEvent'].BOOL,
    }

    if ($('#eventName_1').text() != docData['eventName_1'] && docData["showEvent"] == true)
    {
        $('body')
            .queue(elemHide('div')).delay(1000)
            .queue(elemUpdate())
            .queue(elemShow('div'))
    }

    async function updateEvent () {
        console.log("update")
        if (currentScene != docData['eventScene_1'] || currentStatus != docData['showEvent']) {
            currentScene = docData['eventScene_1'];
            currentStatus = docData['showEvent']
            if (docData['eventScene_1'] == 'startingSoon' && docData["showEvent"] == true) {
                $('body')
                    .queue(elemHide('div')).delay(1000)
                $('#eventName_1').removeClass('eventNameBottom');
                $('#eventName_1').addClass('eventNameTop');
                $('body')
                    .queue(elemShow('div')).delay(1000)
            } else if (docData['eventScene_1'] == 'gamePlay' && docData["showEvent"] == true){
                $('body')
                    .queue(elemHide('div')).delay(1000)
                $('#eventName_1').removeClass('eventNameTop');
                $('#eventName_1').addClass('eventNameBottom');
                $('body')
                    .queue(elemShow('div')).delay(1000)
            } else {
                $('body')
                    .queue(elemHide('div')).delay(1000)
            }
        }
    }

    updateEvent()
    await sleep(1000)
    fetchData()
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
	return function (next) {
		$(elem).removeClass('fast hidden');	
		next();
	}
}

function elemUpdate() {
	return function(next) {
		for (var prop in docData) {
			$('#' + prop).text(docData[prop]);
		}
		next();
	}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkColor(color) {
	if (color == 'mis' || color == 'fis' || color == 'ais' || color == 'zis') {
		return window[color]
	} else {
		return color
	}
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}