var top_time = 100000;

async function playAnimation(place, school, number, name, timems) {
    document.getElementsByClassName("placement")[0].innerHTML = place;
    document.getElementsByClassName("school-code")[0].innerHTML = school;
    document.getElementsByClassName("school-icon")[0].src = "../../../CommonUse/" + school + "_Logo-200x200.png";
    document.getElementsByClassName("skier-number")[0].innerHTML = number;
    document.getElementsByClassName("skier-name")[0].innerHTML = name;


    document.getElementsByClassName("timebox")[0].style.backgroundColor = "white";
    document.getElementsByClassName("time")[0].style.color = "black";

    document.getElementsByClassName("time")[0].innerHTML = formatTime(timems);

    document.getElementsByClassName("main-container")[0].classList.remove("hidden");

    await sleep(3000);

    var difference = top_time - timems;

    if (timems <= top_time || top_time == 0) {
        document.getElementsByClassName("timebox")[0].style.backgroundColor = "mediumseagreen";
        document.getElementsByClassName("time")[0].style.color = "white";

        top_time = timems;
    } else {
        document.getElementsByClassName("timebox")[0].style.backgroundColor = "tomato";
        document.getElementsByClassName("time")[0].style.color = "white"; 
    }

    var differenceText;
    if (difference <= 0) {
        differenceText = "+" + formatDifference(difference * -1);
    } else {
        differenceText = "-" + formatDifference(difference);
    }
    document.getElementsByClassName("time")[0].innerHTML = differenceText;

    await sleep(5000);
    hideScore();
}


function hideScore() {
    document.getElementsByClassName("main-container")[0].classList.add("hidden");
}


playAnimation(1, "MIS", 167, "David Comor", 102836);


function sleep(time) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve("done");
        }, time);
    });
}

function formatTime(timems) {
    var formattedTime = "";
    formattedTime += Math.floor((timems / (1000*60)) % 60);

    if (timems / 1000 % 60  < 10) {
        formattedTime += ":0" + ((timems / 1000) % 60).toFixed(2);
    } else {
        formattedTime += ":" + ((timems / 1000) % 60).toFixed(2);
    }

    return formattedTime;
}

function formatDifference(timems) {
    var formattedTime = "";

    formattedTime += ((timems / 1000)).toFixed(2);

    return formattedTime;
}

setInterval(() => {
    playAnimation(1, "MIS", 167, "David Comor", 102836);
}, 15000);