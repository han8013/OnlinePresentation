var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');
var Classroom = require('./classroom');
var Checker = require('./parameterChecker');

var s = global.s;

exports.getRoute = function (s) {
    var router = Express.Router();

    var jsonParser = BodyParser.json({limit: '10kb'});

    // used by support to push new recitation info to live system
    router.post('/dispatch_classroom', jsonParser, function (req, res, next) {
        console.log('trying to dispatch classroom: '+JSON.stringify(req.body));
        if (!Checker.dispatchRequest(req.body)) return res.send({status: "error", reason: 5});
        s.sessionManager.addSession({
            sessionID: req.body.classNumber,
            privilege: req.body.privilege,
            userList: req.body.userList,
            name: req.body.name,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            status: req.body.status
        }).then(() => {
            res.send({status: "ok"});
        }).catch((err) => {
            res.send({status: "error", reason: err.reason});
        });
    });

    // user's page in the recitation
    router.use('/room/:classroomNumber', function (req, res, next) {
        req.classroomNumber = parseInt(req.params.classroomNumber);
        req.classroomSession = s.sessionManager.getSession(req.classroomNumber);
        if (!req.userLoginInfo) return res.status(401).send("please login first");
        if (req.classroomSession) {
            if (req.classroomSession.userInSession(req.userLoginInfo.userID)) {
                next();
            } else {
                res.status(401).send('user is not in this session');
            }
        } else {
            res.status(400).send("classroom not found");
        }
    }, Classroom.getRoute(s));

    // get current time of the server, used in timeline
    router.all('/current_time', jsonParser, (req, res, next) => {   //send end time if there is one
        res.send({status:"ok",time:(new Date()).toISOString()});
    });
    return router;
};