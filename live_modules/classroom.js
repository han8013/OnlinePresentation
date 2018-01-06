var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');
var ParameterChecker = require('./parameterChecker');
var MongoEscape = require('mongo-escape').escape;
var Request = require("request");

exports.getRoute = function (s) {
    var router = Express.Router({mergeParams: true});

    var jsonParser = BodyParser.json({limit: '10mb'});

    // classroom page
    router.get('/', function (req, res, next) {
        res.render("live", {
            username: req.userLoginInfo.name,
            classroomNumber: req.classroomNumber,
            userID: req.userLoginInfo.userID
        });
    });

    // controller for pushing new transaction to remote
    router.post('/transaction_post', jsonParser, function (req, res, next) {
        var index = req.body.index;
        var module = req.body.module;
        var description = MongoEscape(req.body.description);
        var payload = MongoEscape(req.body.payload);

        // format check
        if (!ParameterChecker.transactionPush(req.body))
            return res.status(400).send({status: 'error', reason: 5});

        var createdBy = req.userLoginInfo.userID;

        // push the transaction to next layer (session)
        req.classroomSession.addTransaction({
            index,
            module,
            description,
            payload,
            createdBy,
        }).then(() => {
            res.send({status: 'ok'});
        }).catch((err) => {
            var message = {status: 'error'};
            if (err.reason) message.reason = err.reason;
            else err.reason = 7;
            if (!s.inProduction) message.detail = err;
            res.send(message);
        });
    });

    // return user's privilege in the recitation
    router.get('/my_privilege', function (req, res, next) {
        var privilege = req.classroomSession.privilege[req.userLoginInfo.userID];
        if (privilege) return res.send({status: 'ok', privilege: privilege});
        else return res.send({status: 'error', reason: 2});
    });

    // user list and their information
    router.get('/user_list', function(req, res, next){
        var userList = req.classroomSession.userList;
        if (userList) return res.send({status: 'ok', userList});
        else return res.send({status: 'error', reason: 2});
    });

    // get the resources list for this recitation
    router.get('/get_resource', function (req, res, next) {
        Request({
            method: 'POST',
            url:"https://recilive.stream/get_resource",
            json: {classNumber: req.classroomNumber}
        }, (error, response, body)=>{
            if(error) return res.status(500).send({status:"error", error, statusCode: response.statusCode});
            return res.send(body);
        });
    });

    return router;
};