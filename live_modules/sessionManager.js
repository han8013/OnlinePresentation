//classroom list
var Session = require("./session");
var When = require('when');
var classroomList = {};
var s = global.s;

/**
 * start creating session from database
 * @returns {Promise|Promise.<TResult>} to read and create all sessions
 */
exports.initSession = function () {
    let sessionListPromise = s.transactionRecord.getSession();
    var sessionInitPromise = [];
    return sessionListPromise.then((sessionList)=> {
        if (sessionList) {
            sessionList.forEach(function (sessionItem) {
                console.log("import session in to session list:" + sessionItem.sessionID);
                classroomList[sessionItem.sessionID] = new Session.session();
                sessionInitPromise.push(
                    classroomList[sessionItem.sessionID].resumeSession(sessionItem)
                );
            })
        }
    }).then(When.all(sessionInitPromise));
};

/**
 * add a new session to the session pool, and write it to the database
 * @param param info to create a new session
 * @returns {Promise} to create this session
 */
exports.addSession = function (param) {
    var sessionID = param.sessionID;
    var privilege = param.privilege;
    var userList = param.userList;
    var name = param.name;
    var startDate = param.startDate;
    var endDate = param.endDate;
    var status = param.status;
    var slidesNumber = param.slidesNumber;
    if (classroomList[sessionID]) {
        console.error("try to add a exist session" + sessionID);
        return new When.reject({reason: 3});
    }
    classroomList[sessionID] = new Session.session();
    return classroomList[sessionID].newSession({sessionID, privilege, userList, name, startDate, endDate, status,slidesNumber});
};

/**
 * delete a session
 * @param param contain the sessionID tobe deleted
 */
exports.deleteSession = function (param) {
    var sessionID = param.sessionID;

    if (classroomList[sessionID]) console.err("overwrite exist session" + sessionItem.sessionID);
    else {
        classroomList[sessionID] = undefined;
        return s.transactionRecord.deleteSession(sessionID);
    }
};

/**
 * get a session from session pool
 * @param sessionID
 * @returns {*}
 */
exports.getSession = function (sessionID) {
    return classroomList[sessionID];
};
