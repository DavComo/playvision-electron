var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.6.3.min.js'; // Check https://jquery.com/ for the current version
document.getElementsByTagName('head')[0].appendChild(script);
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

    fetchData();
};


var docData = {};
var docDataTemp = {};
var colors = {};

var currentScene;
var currentStatus;
var clockUpdating = false;
//Update Data (Source js + refactoring)
async function updateData() {
    for (var index = 0; index < docDataTempTemp.length; index++) {
        var indexkey = docDataTempTemp[index].valueId.S;
        docDataTemp[indexkey] = docDataTempTemp[index];
    }

    docData = {
        "eventTitle-1" : docDataTemp['startingSoon']['eventTitle1'].S,
        "eventTitle-2" : docDataTemp['startingSoon']['eventTitle2'].S,
        "nextEvent" : docDataTemp['startingSoon']['nextEvent'].S,
        "targetTimeMs" : docDataTemp['startingSoon']['targetTimeMs'].S,
        "themeSchool" : docDataTemp['startingSoon']['themeSchool'].S
    }

    for (var i = 0; i < Object.keys(docDataTemp['primaryColors']).length; i++) {
        var schoolCode = Object.keys(docDataTemp['primaryColors'])[i];
        if (schoolCode != "valueId") {
            schools.push(schoolCode);
            colors[schoolCode + "_primary"] = docDataTemp['primaryColors'][schoolCode].S;
            colors[schoolCode + "_secondary"] = docDataTemp['secondaryColors'][schoolCode].S;
        }
    }

    document.getElementsByClassName('topText')[0].innerHTML = docData['eventTitle-1'];
    document.getElementsByClassName('bottomText')[0].innerHTML = docData['eventTitle-2'];
    document.getElementById('nextUp').innerHTML = docData['nextEvent'];
    
    var now = new Date();
    if (now.getHours() >= 12) {
        document.getElementById('am-pm').innerHTML = 'PM';
    } else {
        document.getElementById('am-pm').innerHTML = 'AM';
    }

    var specificTimeZone = Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(now).find(part => part.type === 'timeZoneName').value;
    document.getElementById('timezone').innerHTML = specificTimeZone;
    
    document.getElementById('bottom-bar').style.backgroundColor = colors[docData['themeSchool'].toLowerCase()] + "E6";
    document.getElementById('countdown').style.background = 'linear-gradient(0deg, ' + colors[docData['themeSchool'].toLowerCase()] + ' 0%, #ffffff 50%)';
    document.getElementById('countdown').style.webkitBackgroundClip = 'text';
    document.getElementById('countdown').style.webkitTextFillColor = 'transparent';
    
    if (!clockUpdating) {
        clockUpdating = true;
        updateClocks();
    }
    await sleep(5000)
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


async function updateClocks() {
    while (clockUpdating) {
        var targetTimeMs = docData['targetTimeMs'];
        var currentTimeMs = Date.now();
        var timeLeftMs = targetTimeMs - currentTimeMs;

        if (timeLeftMs <= 0) {
            document.getElementById('countdown').innerHTML = "0:00";
        } else {
            var timeLeftSec = Math.floor(timeLeftMs / 1000 % 60);
            var timeLeftMin = Math.floor(timeLeftMs / 1000 / 60 % 60);
            document.getElementById('countdown').innerHTML = timeLeftMin + ':' + timeLeftSec.toString().padStart(2, '0');
        }

        var now = new Date();
        var hour = now.getHours() % 12 || 12;
        var minute = now.getMinutes();
        document.getElementById('time').innerHTML = hour + ':' + minute.toString().padStart(2, '0');
        await sleep(200);
    }
}