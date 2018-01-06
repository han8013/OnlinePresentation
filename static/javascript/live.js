console.assert(classroomNumber, 'classroomNumber needed to be provided');
console.assert(userID, 'userID needed to be provided');


eventRate = 2048;
microphone_stream = null;
audioCtx = new AudioContext();
soundSystem = new SoundSystem("/room/" + classroomNumber + "/sound", audioCtx.sampleRate, eventRate);
resource = null;

function createEventConstructor(type) {
    var func = function (option) {
        var event = new Event(type);
        return Object.assign(event, option);
    };
    func.type = type;
    return func;
}
events = {
    startRecitation: createEventConstructor('startRecitation'),
    disconnected: createEventConstructor('disconnected'),
    endRecitation: createEventConstructor('endRecitation'),
    switchToPlayBack: createEventConstructor('switchToPlayBack'),
    switchToLive: createEventConstructor('switchToLive'),
    workAreaRatioChange: createEventConstructor('workAreaRatioChange'),
    switchToSpeaker: createEventConstructor('switchToSpeaker'),
    switchToListener: createEventConstructor('switchToListener'),
    newSpeakers: createEventConstructor('newSpeakers'),
    slidesChange: createEventConstructor('slidesChange'),
    viewSizeChange: createEventConstructor('viewSizeChange'),
};

$(document).ready(function () {
    $('.modal').modal();
    $('#draw-color-picker').colorPicker({pickerDefault: "ffffff"});
    $('.student-list').hide();
    $('.dropdown-button').dropdown({
            inDuration: 300,
            outDuration: 225
        }
    );
    $("#info-post").keyup(function (event) {
        var userInput = $("#info-post").val();
        if (event.keyCode == 13 && userInput != "") {
            $("#info-post").val('');
            discussionBoardModule.newThread(userInput);
        }
    });

    $("#post-submit").click(function (event) {
        var userInput = $("#info-post").val();
        if (userInput != "") {
            $("#info-post").val('');
            discussionBoardModule.newThread(userInput);
        }
    });
});

function viewStudentList() {
    if ($('.student-list').css('display') === 'none') {
        $('.student-list').show();
    } else {
        $('.student-list').hide();
    }
}

function viewInfoBoard() {
    if ($('#info-board').css('display') === 'none') {
        $('#info-board').show();
    } else {
        $('#info-board').hide();
    }
}

function updateStudentList(students) {
    $(".student-list").empty();
    students.forEach(function (student) {
        if (student.role === "speaker") {
            $(".student-list").append("<h4 onclick=selectUser('" + student.id + "')>" + student.name + "<i class='fa fa-microphone student-microphone'></i></h4>");
        } else {
            $(".student-list").append("<h4 onclick=selectUser('" + student.id + "')>" + student.name + "<i class='fa fa-headphones student-microphone'></i></h4>");
        }
    });
}

function selectUser(student) {
    soundControlSystem.giveSpeakerRoleTo(student);
    console.log('speaker switching to ' + student.toString());
}

function selectPostColor() {
    var choices = ['#f2b632', '#428bca', '#c5e9b8', '#cd5c5c'];
    var index = Math.floor(Math.random() * choices.length);
    return choices[index];
}

function addReplies(div, message) {
    var repliesContainer = $(div).children(".replies-container");
    var dropContainer = $(div).children(".replies-drop-down-container");
    repliesContainer.prepend("<p>" + message + "</p>");
    while(repliesContainer.children().length > 2){
        $(repliesContainer.children()[2]).prependTo(dropContainer);
    }
}

function newPost(message, posx, posy, color, id) {
    var inputId = Math.floor(Math.random() * 300);

    var $newdiv = $("<div class='post'><h4>" + message + "</h4><span>reply:</span><span><input data-id='#" + inputId + "' id='" + inputId + "'/></span><div class='replies-container'></div><div class='replies-drop-down-container'></div></div>").css({
        'background-color': color
    });

    posx = (posx / 10 * 8) * 100;
    posy = (posy / 10 * 8) * 100;

    var replyButton = $newdiv.find("#" + inputId);
    replyButton.keyup(function (event) {
        if (event.keyCode == 13&&replyButton.val()!="") {
            discussionBoardModule.newReply(replyButton.val(), id);
            replyButton.val('');
        }
    });

    $newdiv.css({
        'position': 'absolute',
        'left': posx + '%',
        'top': posy + '%',
        'display': 'none',
        'padding': '5px'
    }).appendTo('#info-board').fadeIn(500, function () {});
    $newdiv.find('span').css({
        display: 'inline-block'
    });
    //$('#info-post').val('');
    return $newdiv;
}

transactionSystem = new TransactionSystem("/room/" + classroomNumber + "/transaction");
transactionSystem.roomNumber = classroomNumber;
transactionSystem.userID = userID;
soundControlSystem = new SoundControl(transactionSystem);
viewManager = new ViewManager($('.stage-view'));
slideModule = new Slide(transactionSystem, viewManager.getDiv(), $('#previous-slide'), $('#next-slide'), $('#slides-selector'));
drawModule = new Draw(transactionSystem, viewManager.getDiv(), $('#draw'));
discussionBoardModule = new DiscussionBoard(transactionSystem, newPost, addReplies);
transactionSystem.registerModule(slideModule.moduleName, slideModule);
transactionSystem.registerModule(soundControlSystem.moduleName, soundControlSystem);
transactionSystem.registerModule(drawModule.moduleName, drawModule);
transactionSystem.registerModule(discussionBoardModule.moduleName, discussionBoardModule);
sliderController = new replayController(soundSystem, transactionSystem, $('.slider__range'), $('#slider-div'));
$('.ending-controller').click(transactionSystem.endRecitation);
document.addEventListener(events.endRecitation.type, (e) => {
    // if class has ended
    $(".rec-ended-notification").css("display", "block");
    // show the ended image
}, false);

var loadingDialog;
var prestartDialog;
loadingDialog = vex.dialog.open({
    message: 'page loading...',
    buttons: [],
    overlayClosesOnClick: false
});
//promiselist wait for the respose for vps(privilege and resource)
var promiseList = [$.ajax({
    url: window.location.href.split(/\?|#/)[0] + '/my_privilege',
    type: 'get',
    dataType: 'json',
}), $.ajax({
    url: 'https://recilive.stream/ajax/get-recitation-resource?numericID=' + encodeURIComponent(classroomNumber),
    type: 'get',
    dataType: 'json',
    xhrFields: {withCredentials: true},
}), $.ajax({
    url: window.location.href.split(/\?|#/)[0] + '/user_list',
    type: 'get',
    dataType: 'json'
})];
Promise.all(promiseList).then(function (result) {
    //handle the privilege
    if (result[0].status == 'ok') {
        transactionSystem.privilege = result[0].privilege;
    } else throw result[0];
    if (result[2].status == 'ok') {
        transactionSystem.userList = result[2].userList;
    } else throw result[2];
    //handle the resource
    resource = result[1].resources;
}).then(function () {
    //set handler for review mode
    sliderController.presetEvent();
    slideModule.presetEvent();
    drawModule.presetMethod();
    if(transactionSystem.privilege.indexOf('admin')==-1)
        $('.fa.fa-power-off.fa-3x.ending-controller').hide();
}).then(transactionSystem.init).then(function () {
    if (!transactionSystem.firstTransactionTime()) {
        // no transaction posted
        return new Promise(function (resolve, reject) {
            if (transactionSystem.privilege.indexOf('admin') >= 0) {
                // lecturer coming
                prestartDialog = vex.dialog.open({
                    message: 'the class has not started yet',
                    buttons: [{
                        text: 'start class', type: 'button', className: 'vex-dialog-button-primary',
                        click: function () {
                            transactionSystem.startRecitation();
                        }
                    }],
                    overlayClosesOnClick: false,
                });
            } else {
                // student coming
                prestartDialog = vex.dialog.open({
                    message: 'the class has not started yet',
                    buttons: [],
                    overlayClosesOnClick: false,
                });
            }
            document.addEventListener(events.startRecitation.type, function handler(e) {
                resolve(e);
                event.currentTarget.removeEventListener(event.type, handler);
            }, false);
        });
    }
}).then(function (event) {
    if (prestartDialog) vex.close(prestartDialog);
}).then(soundControlSystem.init).then(function (result) {
    slideModule.init();
    sliderController.init();
    viewManager.init();
    drawModule.init();
    return activateSound();
}).then(() => {
    if (loadingDialog) vex.close(loadingDialog);
    console.log('ready');
}).catch(function (e) {
    console.error(e);
});

// initialize the audio processing
script_processor_node = audioCtx.createScriptProcessor(eventRate, 1, 1);
script_processor_node.onaudioprocess = function (audioProcessingEvent) {
    var inputBuffer = audioProcessingEvent.inputBuffer;
    var outputBuffer = audioProcessingEvent.outputBuffer;
    var inputData = inputBuffer.getChannelData(0);
    var outputData = outputBuffer.getChannelData(0);
    if (soundControlSystem.asSpeaker && transactionSystem.liveFlag)
        soundSystem.send(inputData);
    if (soundControlSystem.asListener)
        soundSystem.writeNextSoundBuffer(outputData);
    else {
        for (var i = 0; i < eventRate; i++) {
            outputData[i] = 0;
        }
    }
};
microphone_stream = null;
microphone_stream_ctx = null;

/**
 * Activate or reconfig the audio process flow. This method should be called after soundControlSystem has been initialized
 * @returns {Promise} to config the audio flow. If the microphone is needed, use has to grant the microphone permission
 * to resolve the promise.
 */
function activateSound() {
    return new Promise(function (resolve, reject) {
        if (!soundControlSystem.asSpeaker) {
            return start_microphone();
        }
        if (microphone_stream) {
            return start_microphone(microphone_stream_ctx);
        }
        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if (navigator.getUserMedia) {
            navigator.getUserMedia({audio: true}, function (stream) {
                if (microphone_stream !== stream && microphone_stream)
                    console.warn('microphone_stream !== stream');
                if (!microphone_stream) microphone_stream = stream;
                if (!microphone_stream_ctx) microphone_stream_ctx = audioCtx.createMediaStreamSource(microphone_stream);
                start_microphone(microphone_stream_ctx);
            }, function (e) {
                alert('Error capturing audio.');
                reject({reason: 'audio permission rejected'});
            });
        } else {
            alert('getUserMedia not supported in this browser.');
            reject({reason: 'getUserMedia not supported in this browser.'});
        }

        function start_microphone(stream) {
            console.log('native sample rate: ' + audioCtx.sampleRate);
            if (soundControlSystem.asListener) soundSystem.receiveFlag = true;
            soundSystem.connect();
            if (stream) {
                stream.connect(script_processor_node);
            }
            script_processor_node.connect(audioCtx.destination);
            return resolve();
        }
    });
}

// attach handler to change speaker role
document.addEventListener(events.switchToSpeaker.type, activateSound, false);
document.addEventListener(events.switchToSpeaker.type, (e) => {
    if (e.changed) {
        toastr.success('You are in speaking now', '', {timeOut: 2000, progressBar: true});
    }
}, false);
document.addEventListener(events.switchToListener.type, activateSound, false);
document.addEventListener(events.switchToListener.type, (e) => {
    if (e.changed) {
        toastr.info('You speaking is ended', '', {timeOut: 2000, progressBar: true});
    }
}, false);

document.addEventListener(events.newSpeakers.type, (e) => {
    var userNameList = [];
    e.newSpeakers.forEach((userID) => {
        var userInfo = transactionSystem.userList[userID];
        userNameList.push(userInfo.name || userInfo.email);
    });
    toastr.info(userNameList.join(', ') + ' is now speaking', '', {timeOut: 2000, progressBar: true});
}, false);

document.addEventListener(events.endRecitation.type, (e) => {
    toastr.success('Class is ended', '', {timeOut: 10000, progressBar: true});
}, false);
