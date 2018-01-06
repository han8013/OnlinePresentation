const When = require('when');
const s = global.s;

var classDB = {};
exports.initDatabase = function (readyList) {
    var classDBPath = s.dbPath + "class";
    var classDBReady = When.defer();
    readyList.push(classDBReady.promise);
    console.log('try to connect to ' + classDBPath);

    s.mongodb.MongoClient.connect(classDBPath, function (err, db) {
        if (err) {
            console.error('MongodbClient connection ' + classDBPath + ' failed')
            process.exit(1);
        } else {
            console.log('MongodbClient connection to ' + classDBPath + ' has been established');

            classDB.classesColl = db.collection('classes');
            classDB.classesColl.createIndex({owner: 1});
            classDB.classesColl.createIndex({createdAt: -1});

            classDB.classEnrollColl = db.collection('classEnroll');
            classDB.classEnrollColl.createIndex({'class': 1});
            classDB.classEnrollColl.createIndex({'user': 1});

            classDB.recitationColl = db.collection('recitation');
            classDB.recitationColl.createIndex({owner: 1});
            classDB.recitationColl.createIndex({numericID: 1}, {unique: true});

            classDBReady.resolve();
        }
    });
};

//class: name, startDate, endDate, createdAt, owner
//recitation: numericID, name, startDate, endDate, createdAt, parentClass
exports.getClassesByOwner = function (owner) {
    return classDB.classesColl.find({owner}).sort({'createdAt': -1}).toArray();
};

exports.getClassesByStudent = function (student) {
    return classDB.classEnrollColl.find({user: student}).sort({_id: -1}).toArray().then((classesList) => {
        var proList = [];
        classesList.forEach((clazz, index) => {
            proList[index] = new When.Promise((resolve, reject) => {
                classDB.classesColl.findOne({_id: clazz.class}, function (err, result) {
                    if (err) return reject(err);
                    if (!result) return reject(new Error('no result found'));
                    return resolve(result);
                });
            });
        });
        return When.all(proList);
    });
};
/**
 * @param classID class moongo id(_id)
 * @param owner owner mongo id
 * @returns {Promise.<TResult>|Promise}
 */
exports.getClassByMongoID = (classID) => {
    return classDB.classesColl.findOne({_id:  classID}).then((clazz) => { //privilege check
        if (clazz)
            return clazz;
        else throw new Error("no such class exist");
    })
};

/**
 * change the class information by instuctor
 * @param classID   mongoid
 * @param classInfo     obj have all the modified info
 * @param owner         mongoid
 * @returns {Promise|Promise.<TResult>}
 */
exports.editClassByMongoID = (classID, classInfo) => {
    return classDB.classesColl.updateMany({_id: classID}, {    //update info
        $set: {
            name: classInfo.name,
            startDate: new Date(classInfo.startDate),
            endDate: new Date(classInfo.endDate),
        }
    });   //all the error send to controller to handle
};
/**
 * send all the privilege back with email and student id
 * @param classID       mongoid
 * @param owner         mongoid
 * @returns {Promise|Promise.<TResult>}
 */
exports.getPrivilegeList = (classID) => {
    return classDB.classEnrollColl.find({class: classID}).toArray().then((studentList) => {
        var primiseList = [];
        var privilegeList = [];
        for (index in studentList) {
            primiseList[index] =
                s.userConn.getUserByMongoID(studentList[index].user).then((user) => {
                    privilegeList.push( {_id: studentList[index].user, email: user.email});
                });
        }
        return When.all(primiseList).then(() => {
            return privilegeList;
        });
    })
};

exports.getStudentsByClass = function (clazz) {
    return classDB.classEnrollColl.find({class: s.mongodb.ObjectID(clazz)}).sort({_id: -1}).toArray();
};

exports.addStudentToClass = function (student, clazz) {
    return classDB.classEnrollColl.updateMany({'user': student, 'class': clazz}, {
        $set: {
            'user': student,
            'class': clazz
        }
    }, {upsert: true});
};

exports.addClass = function (name, startDate, endDate, owner) {
    var insertObj = {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdAt: new Date(),
        owner: s.mongodb.ObjectID(owner),
    };
    return classDB.classesColl.insertOne(insertObj).then(() => insertObj);
};

exports.deletePrivilegeListByClassId = function(classId){
    return classDB.classEnrollColl.deleteMany({class:classId});
};
/**
 * delete class by mongoid delete class and enroll info
 * @param classID mongoid
 * @param owner mongoid
 * @returns {Promise.<TResult>|Promise}
 */
exports.deleteClassByMongoID = (classID) => {
        var deleteReadyList = [];
        deleteReadyList[0] = classDB.classEnrollColl.deleteMany({class: classID});
        deleteReadyList[1] = classDB.classesColl.deleteMany({_id: classID});
        deleteReadyList[2] = classDB.recitationColl.deleteMany({parentClass: classID});
        return When.all(deleteReadyList);
};
/**
 * deleteRecitation with privilege check
 * @param recitationID
 * @param owner
 * @returns {*|Promise.<TResult>|Promise}
 */
exports.deleteRecitation = (recitationID) => {
    return classDB.recitationColl.deleteMany({_id: s.mongodb.ObjectID(recitationID)});
};
/**
 * addRecitation
 * @param name
 * @param startDate
 * @param endDate
 * @param parentClass  mongoid
 * @returns {Promise.<TResult>|Promise}
 */
exports.addRecitation = function (name, startDate, endDate, parentClass) {
    var numericID = Math.floor(Math.random() * 10000000);
    var insert = {
        numericID,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdAt: new Date(),
        parentClass: s.mongodb.ObjectID(parentClass),
        status: "LIVE"
    };
    return classDB.recitationColl.insertOne(insert).then(() => {
        return insert
    });
};
/**
 * getRecitationsByClass
 * @param parentClass
 * @returns {Promise}
 */
exports.getRecitationsByClass = function (parentClass) {
    return classDB.recitationColl.find({
        parentClass: s.mongodb.ObjectID(parentClass)
    }).sort({'createdAt': -1}).toArray();
};
/**
 * getRecitationByMongoID
 * @param recitationId
 * @returns {Promise}
 */
exports.getRecitationByMongoID = (recitationId) => {
    return classDB.recitationColl.findOne({_id: recitationId});
};

exports.editRecitation = (recitationId, recitationInfo) => {
    return classDB.recitationColl.updateMany({_id: recitationId}, {
        $set: {
            name: recitationInfo.name,
            startDate: new Date(recitationInfo.startDate),
            endDate: new Date(recitationInfo.endDate)
        }
    });
};

exports.changeRecitation = (recitationNumericId, recitationInfo)=>{
    return classDB.recitationColl.updateMany({numericID: recitationNumericId}, {
        $set: {
            status:recitationInfo.status
        }
    });
};

exports.setRecitationResource = (recitationID, resourcesObj) => {
    return classDB.recitationColl.updateMany({_id: recitationID}, {
        $set: {
            resources: resourcesObj
        }
    }, {upsert: true});
};

exports.getRecitationResource = (recitationID) => {
    return classDB.recitationColl.findOne({_id: recitationID}).then((recitation) => {
        return recitation.resources;
    });
};

/**
 * get a list of participant of the class. the first element is the owner of the class.
 * @param recitationID (ObjectID)
 * @returns {Promise|Promise.<TResult>} to a list of participant
 */
exports.getRecitationParticipant = (recitationID) => {
    var recitationDoc;
    var parentClass;
    return classDB.recitationColl.findOne({_id:recitationID}).then((recitationD) => {
        if (!recitationD) throw new Error('no such recitation');
        recitationDoc = recitationD;
        return classDB.classesColl.findOne({_id: recitationDoc.parentClass});
    }).then((parent) => {
        if (!parent) throw new Error('no such class');
        parentClass = parent;
        return s.classConn.getStudentsByClass(parentClass._id);
    }).then((students) => {
        var result = [parentClass.owner.toString()];
        students.forEach((student) => {
            result.push(student.user.toString());
        });
        return result;
    });
};

exports.getRecitationByNumericID=(numericID)=>{
    return classDB.recitationColl.findOne({numericID:numericID});
};
