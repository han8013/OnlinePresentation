const ChildProcess = require('child_process');
const Os = require('os');

var npmResult;
if(Os.platform() == 'win32'){
    npmResult = ChildProcess.spawnSync('npm.cmd', ['install'], {stdio: 'inherit'});
}else{
    npmResult = ChildProcess.spawnSync('npm', ['install'], {stdio: 'inherit'});
}
if(npmResult.status != 0){
    console.error('live_modules install failed, app.js cannot proceed. exiting...');
    process.exit(1);
}

var Cluster = require('cluster');

if (Cluster.isMaster) {
    var numWorkers = process.env.WORKERS || 1;
    console.log('Master cluster setting up ' + numWorkers + ' workers...');
    for (var i = 0; i < numWorkers; i++) {
        Cluster.fork();
    }
    Cluster.on('online', function (worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });
    Cluster.on('exit', function (worker, code, signal) {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        console.log('Starting a new worker');
        Cluster.fork();
    });
} else {
    global.log = require('./live_modules/logging');
    var Express = require('express');
    const Http = require('http');
    const Https = require('https');
    const CookieParser = require('cookie-parser');
    const Helmet = require('helmet');
    const Mongodb = require('mongodb');
    const When = require('when');
    const Ejs = require('ejs');
    const Fs = require('fs');
    const WSWebSocket = require("ws").Server;
    const Validator = require("better-validator");
    const Request = require("request");
    const Login = require('./live_modules/google_login');

    const validator = new Validator();

    var WSHandle = require('./live_modules/websocket');
    var Tools = require('./tools.js');
    var readyList = [];
    global.s = {
        wsHandler: new WSHandle.WSHandler(),
        mongodb: Mongodb,
        dbPath: process.env.DB_PATH || 'mongodb://localhost:27017/',
        googleLoginTool: require('./live_modules/google_login'),
        inProduction: process.env.NODE_ENV === 'production',
        googleLoginClientID: process.env.GOOGLE_LOGIN_CLIENT_ID,
        role: process.env.ROLE,
        classConn: null,
        userConn: null,
    };
    s.tools = Tools.getToolSet(s);
    if (s.role == 'support') {
        s.userConn = require('./database/user_db');
        s.userConn.initDatabase(readyList);
        s.classConn = require('./database/class_db');
        s.classConn.initDatabase(readyList);
        s.resourceConn = require('./database/resource_db');
        s.resourceConn.initDatabase(readyList)
    } else if (s.role == 'live') {
        s.transactionRecord = require('./database/transaction_record.js');
        s.transactionRecord.initDatabase(readyList);
    }

    s.sessionManager = require('./live_modules/sessionManager');

    var app = Express();

    app.use(Helmet({hsts: false}));
    app.use('/static', Express.static(__dirname + '/static'));
    app.use((req, res, next)=> { // http redirection
        if (req.protocol == 'http' && s.inProduction) {
            res.redirect('https://recilive.stream')
        }else if(req.headers.host == 'www.recilive.stream'){
            res.redirect('https://recilive.stream')
        } else {
            next();
        }
    });
    app.use(CookieParser());
    app.set('view engine', 'ejs');
    if (!s.inProduction) {
        app.use((req, res, next)=> {
            log.debug("visited: " + req.originalUrl);
            next();
        });
    }
    app.use(function (req, res, next) {
        req.userLoginInfo = null;
        res.locals.userLoginInfo = null;
        next();
    });

    if (s.role == 'support') {
        app.use((req, res, next)=> {
            if (!req.cookies.login_session) return next();
            s.userConn.getUserInfoBySession(req.cookies.login_session).then((userInfo) => {
                if (!userInfo) {
                    res.clearCookie('login_session', {domain: '.recilive.stream'});
                    return res.redirect('/');
                }
                req.userLoginInfo = userInfo;
                req.userLoginInfo.userID = userInfo._id;
                req.userLoginInfo.record = userInfo;
                res.locals.userLoginInfo = req.userLoginInfo;
                return next();
            }).catch((e) => {
                res.status(400).send({result: false, reason: e.message || "fail to retrieve user info"});
            });
        });
    } else if (s.role == 'live') {
        app.use((req, res, next)=> {
            if (!req.cookies.login_session) return next();
            Login.liveGetUserInfo(req.cookies.login_session).then((body)=> {
                req.userLoginInfo = body;
                req.userLoginInfo.userID = body._id;
                req.userLoginInfo.record = body;
                res.locals.userLoginInfo = req.userLoginInfo;
                return next();
            }).catch((err)=> {
                return res.status(500).send({result: false, reason: err.message});
            });
        });
    }

// ---------------all available role section -----------
    if (s.role == 'support') app.use('/', require('./support_routes').getRoute(s));
    else if (s.role == 'live') app.use('/', require('./live_modules/rest').getRoute(s));
    else console.error('WARNING: no role assigned');

// ---------------error handling section ---------------
// 404 error
    app.all('*', function (req, res, next) {
        // res.status(404).send("404 NOT FOUND");
        res.render("404.ejs");
    });
// default error handling
    app.use(function (err, req, res, next) {
        console.error(err.stack || err);
        // res.status(500).send("500 SERVER ERROR");
        res.render("error.ejs", {
            message: err
        });
    });

// create server
    var httpServer = Http.createServer(app);
    if (process.env.HTTPS_PORT) {
        try {
            var privateKey = Fs.readFileSync(process.env.HTTPS_KEY_PATH, 'utf8');
            var certificate = Fs.readFileSync(process.env.HTTPS_CERT_PATH, 'utf8');
            var credentials = {key: privateKey, cert: certificate};
            var httpsServer = Https.createServer(credentials, app);
        } catch (e) {
            console.error(e);
            console.error('fail to read essential https files');
            delete process.env.HTTPS_PORT;
        }
    }

    wsServer = new WSWebSocket({server: httpServer, perMessageDeflate: false});
    wsServer.on('connection', s.wsHandler.handle);
    if (process.env.HTTPS_PORT) {
        wsServer = new WSWebSocket({server: httpsServer});
        wsServer.on('connection', s.wsHandler.handle);
    }

// start up server
    if (s.role == 'support') {
        When.all(readyList).then(function () {
            var httpPort = process.env.HTTP_PORT || 3000;
            var httpsPort = process.env.HTTPS_PORT;
            httpServer.listen(httpPort);
            if (httpsPort) {
                httpsServer.listen(httpsPort);
                console.log('https ready on ' + httpsPort);
            }
            console.log('http ready on ' + httpPort);
        });
    } else if (s.role == 'live') {
        When.all(readyList).then(s.sessionManager.initSession).then(function () {
            var httpPort = process.env.HTTP_PORT || 3000;
            var httpsPort = process.env.HTTPS_PORT;
            httpServer.listen(httpPort);
            if (httpsPort) {
                httpsServer.listen(httpsPort);
                console.log('https ready on ' + httpsPort);
            }
            console.log('http ready on ' + httpPort);
        });
    } else {
        console.error('WARNING: no role assigned');
    }
}

