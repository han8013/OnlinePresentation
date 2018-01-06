const When = require('when');
const validator = new (require('better-validator'))();
const RandomString = require('randomstring');

const s = global.s;

var userDB = {};
exports.initDatabase = function (readyList) {
    var userDBPath = s.dbPath + "user";
    var userDBReady = When.defer();
    readyList.push(userDBReady.promise);
    console.log('try to connect to ' + userDBPath);

    s.mongodb.MongoClient.connect(userDBPath, function (err, db) {
        if (err) {
            console.error('MongodbClient connection ' + userDBPath + ' failed');
            process.exit(1);
        } else {
            console.log('MongodbClient connection to ' + userDBPath + ' has been established');
            userDB.usersColl = db.collection('users');
            userDB.usersColl.createIndex({googleID: 1});
            userDB.usersColl.createIndex({email: 1}, {unique: true});
            userDB.sessionColl = db.collection('session');
            userDB.sessionColl.createIndex({session: 1});
            userDBReady.resolve();
        }
    });
};

//email, role, google id, username
/**
 * get user by its google id
 * @param id
 * @returns {Promise} returns the doc its self, otherwise null
 */
exports.getUserByGoogleID = function (id) {
    return userDB.usersColl.findOne({googleID: id});
};

exports.getUserByMongoID = (mongoId)=>{
    return userDB.usersColl.findOne({_id:mongoId});
};

exports.getUserByEmail = function (email) {
    return userDB.usersColl.findOne({email});
};

exports.addUser = function (googleID, email, role, username,photo,_id) {
    _id = s.mongodb.ObjectID(_id);
    return userDB.usersColl.insertOne({
        googleID,
        email,
        role,
        username,
        _id,
        photo
    });
};

exports.setUserInfo = function (_id, change) {
    _id = s.mongodb.ObjectID(_id);
    return userDB.usersColl.updateMany({_id}, {$set: change});
};

exports.basicUserInfoRule = (obj) => {
    obj.required().isObject((obj)=>{
        obj('googleID').isString().required();
        obj('email').isString().required();
        obj('username').isString().required();
    });
};

exports.matchBasicUserInfoRule = (obj)=>{
    return !!(obj.googleID && obj.email && obj.username && obj.photo);
};

exports.addSession = (userID)=>{
    userID = s.mongodb.ObjectID(userID);
    var session = RandomString.generate({
        length: 128,
        charset: 'alphabetic'
    });
    return userDB.sessionColl.insertOne({session, userID}).then(()=>{
        return session;
    });
};

exports.getUserInfoBySession = (session)=>{
    return userDB.sessionColl.findOne({session}).then((doc)=>{
        if(!doc) return When.resolve(null);
        return userDB.usersColl.findOne({_id:doc.userID});
    });
};

exports.removeSession = (session)=>{
    return userDB.sessionColl.removeMany({session});
};