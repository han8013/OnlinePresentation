var When = require('when');

var s = global.s;
var fileDB = {}; // user related collection

exports.initDatabase = function (readyList) {

    // file initialization
    var fileDBPath = s.dbPath + 'recilive_files';
    var fileDBReady = When.defer();
    readyList.push(fileDBReady.promise);
    console.log('try to connect to '+fileDBPath);
    s.mongodb.MongoClient.connect(fileDBPath, function (err, db) {
        function ready(db, err, result) {
            if (err) {
                console.error('MongodbClient connection ' + fileDBPath + ' failed');
                process.exit(1);
            } else {
                console.log('MongodbClient connection to ' + fileDBPath + ' has been established');

                fileDB.resouceFileBucket = new s.mongodb.GridFSBucket(db, {bucketName: 'resouceFileBucket'});

                fileDBReady.resolve();
            }
        }

        if (s.dbAuth && s.dbAuth.username && s.dbAuth.password) {
            db.admin().authenticate(s.dbAuth.username, s.dbAuth.password, function (err, result) {
                ready(db, err, result);
            });
        } else {
            ready(db, err, null);
        }
    });
};

exports.getResourceFileBucket = function(){
    return fileDB.resouceFileBucket;
};