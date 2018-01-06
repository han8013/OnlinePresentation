var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when');                                  // used by sequential callback

exports.getRoute = function (s) {
    var router = Express.Router();                          //create a new router later on will add in the app.js
    var jsonParser = BodyParser.json({limit: '10kb'});      //json parser parse the request before router run it's content

    // check user is in the database
    router.post('/ajax/check-user', jsonParser, function (req, res, next) {     //check user has role for front end sign_up needed
        if (req.userLoginInfo.record||req.userLoginInfo.record.role) {
            res.send({result: true, sign_up: false, redirect: '/course'});
        } else {
            res.send({result: true, sign_up: true});
        }
    });

    // login user, may write user info to database if needed
    router.post('/ajax/login', jsonParser, function (req, res, next) {　//login ajax post
        if(!req.body.IDToken){
            return res.status(400).send({result: false, reason: 'format error'});
        }
        var hasRole = false;
        var googleUserInfo;
        s.googleLoginTool.getUserInfo(req.body.IDToken).then((userInfo)=> {
            googleUserInfo = userInfo;
            return s.userConn.getUserByEmail(userInfo.email);
        }).then((userInfo)=>{
            if(!userInfo){ // user is not in db
                return s.userConn.addUser(googleUserInfo.userID, googleUserInfo.email, null, googleUserInfo.name,googleUserInfo.photo).then((result)=>{
                    return result.insertedId;
                });
            }else if(s.userConn.matchBasicUserInfoRule(userInfo)){ // user has complete info
                hasRole = !!userInfo.role;
                return userInfo._id;
            }else{ // user info is incomplete
                hasRole = !!userInfo.role;
                let record = {googleID: googleUserInfo.userID, username: googleUserInfo.name,photo:googleUserInfo.photo};
                return s.userConn.setUserInfo(userInfo._id, record).then((result)=>{
                    return userInfo._id;
                });
            }
        }).then((userID)=>{ //add session
            return s.userConn.addSession(userID);
        }).then((session)=>{    // add cookie
            res.cookie('login_session', session, {
                httpOnly: true,
                secure: !!s.inProduction,
                expires: (new Date(Date.now() + 180 * 24 * 3600 * 1000)),
                domain: '.recilive.stream'
            });
            res.send({result: true, hasRole});
        }).catch((err)=> {
            res.status(403).send("google login failed: "+(err.message?err.message:"unknown error"));
        });
    });

    // sign up and update the role of the user
    router.post('/ajax/sign-up', jsonParser, (req, res, next) => {          //new user sign_up
        if(!req.userLoginInfo) return res.status(403).send('login first');
        s.userConn.setUserInfo(req.userLoginInfo.record._id,{role:req.body.role}).then(() => {
            res.send({result: true, redirect: '/course'});
        }).catch((e) => {
            res.send({result: false, reason: e.message || "error add user to db"});
        });
    });

    // get user info
    router.get('/ajax/live-get-user-info', jsonParser, (req, res, next) => {     //live send mongo id and get all user info
        s.userConn.getUserInfoBySession(req.query.session).then((userInfo) => {
            res.send(userInfo);
        }).catch((e) => {
            res.status(400).send({result: false, reason: e.message || "error get user by google id"});
        });
    });

    // log out and clear cookie
    router.all('/ajax/logout', (req, res, next)=>{      //get and post for logout
        s.userConn.removeSession(req.cookies.login_session);
        res.clearCookie('login_session', {domain: '.recilive.stream'});
        res.redirect('/');
    });

    return router;
};
