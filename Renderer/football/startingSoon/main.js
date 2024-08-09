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
var music = {};
var musicTotalTime = 0;

function indexMusic() {
    for (var i = 0; i < window.music['order'].length; i++) {
        var audio = new Audio('http://localhost:5500/Music/startingSoon/' + window.music['order'][i]);
        audio.addEventListener('loadedmetadata', function() {
           window.music['totalTimeSeconds'] += this.duration;
        });
    }
}

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

    window.music = {
        "totalTimeSeconds" : 1280,
        "order" : [
            "HardToMoveOn",
            "ForgetYou",
            "BeStrong",
            "ForeverAgain",
            "FeelSoAlive",
            "TinDistortion",
            "Venture"
        ],
        "lengths" : [
            182, //21:20
            183, //18:18
            200, //15:15
            122, //11:55
            189, //9:53
            209, //6:44
            195 //3:15
        ]
    };

    //indexMusic();
    console.log(window.music['totalTimeSeconds']);
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

    if (docDataTemp['startingSoon']['targetTimeMs'].S != docData['targetTimeMs']) {
        window.songsPlaying = false;
        document.getElementById(window.music['order'][currentSongIndex]).pause();
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

var currentSongIndex = 0;
var songsPlaying = false;

function playAudio(timeLeftSec) {
    return new Promise(res=>{
        var lengthTime = window.music['totalTimeSeconds'];
        for (var i = 0; i < window.music['lengths'].length; i++) {
            if (lengthTime <= timeLeftSec) {
                currentSongIndex = i;
                break;
            } else {
                lengthTime -= window.music['lengths'][i];
            }
        }
        if (lengthTime < timeLeftSec) {
            console.log("Song index: " + currentSongIndex + " | Time left: " + timeLeftSec + " | Length time: " + lengthTime);
            window.songsPlaying = false;
            return;
        }
        var audio = document.getElementById(window.music['order'][currentSongIndex])
        if (!window.songsPlaying) {
            window.songsPlaying = true;
            console.log("Playing song: " + currentSongIndex);
            audio.play()
                .then(() => {
                    console.log("Playing audio");
                    window.songsPlaying = true;
                })
                .catch(error => {
                    console.log("Error playing audio:", error);
                    window.songsPlaying = false;
                    res();
                });

            audio.onended = function() {
                console.log("Song ended: " + currentSongIndex);
                window.songsPlaying = false;
                res()
            }   
        }
    })
}

async function playSongs(timeLeftSec) {
    if (window.songsPlaying || timeLeftSec == 0) {
        return;
    }
    
    await playAudio(timeLeftSec);
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

            if ((timeLeftSec + timeLeftMin * 60) == Math.ceil(window.music['totalTimeSeconds'])) {
                //playSongs();
                window.songsPlaying = true;
            } else if ((timeLeftSec + timeLeftMin * 60) < Math.ceil(window.music['totalTimeSeconds']) && !window.songsPlaying) {
                //playSongs(timeLeftSec + timeLeftMin * 60);
            }
        }

        var now = new Date();
        var hour = now.getHours() % 12 || 12;
        var minute = now.getMinutes();
        document.getElementById('time').innerHTML = hour + ':' + minute.toString().padStart(2, '0');
        await sleep(200);
    }
}