var Express = require('express');               //router
var BodyParser = require('body-parser');        //json parser
var When = require('when');                     // used by sequential callback

exports.getRoute = function (s) {
    var router = Express.Router();              //return all the parsere
    var jsonParser = BodyParser.json({limit: '10kb'});

    // course page
    router.get('/course', jsonParser, function (req, res, next) {       //redirect to course page depend on the role
        if (!req.userLoginInfo) {
            return res.render("error.ejs", {
                message: 'please login first'
            });
        }
        let classes = [];
        s.classConn.getClassesByOwner(req.userLoginInfo.record._id).then((r) => {
            r.forEach(function (element) {
                classes.push({id: element._id, name: element.name, editable: req.userLoginInfo.record._id.toString() == element.owner});
            });
            return s.classConn.getClassesByStudent(req.userLoginInfo.record._id);
        }).then((r)=>{
            r.forEach(function (element) {
                classes.push({id: element._id, name: element.name, editable: req.userLoginInfo.record._id.toString() == element.owner});
            });
            res.render("course.ejs", {
                username: req.userLoginInfo.record.photo,
                instructor: req.userLoginInfo.record.role == "Instructor",
                classes: classes
            });
        }).catch((e) => {
                res.render("error.ejs", {
                    message: e.message ? e.message : 'get classes by instructor error'
                });
            }
        );
    });

    // add a class
    router.post('/ajax/add-class', jsonParser, function (req, res, next) {      //add class room to database
        s.classConn.addClass(req.body.name, req.body.startDate, req.body.endDate, req.userLoginInfo.record._id).then((clazz) => {       //return a premise
            return s.tools.listPromise(req.body.students, (email) => {
                return s.userConn.getUserByEmail(email).then((user) => {
                    if (user) {
                        return s.classConn.addStudentToClass(user._id, clazz._id);
                    } else {
                        var userID = s.mongodb.ObjectID();
                        return s.userConn.addUser(null, email, null, null, null, userID).then(() => {
                            return s.classConn.addStudentToClass(userID, clazz._id);
                        });
                    }
                });
            });
        }).then((result) => {
            res.send({result: true});
        }).catch((err) => {
            res.status(400).send({result: false, reason: err.message ? err.message : 'unknown error'});
        });
    });

    // get class info
    router.post('/ajax/get-edit-class-info', jsonParser, (req, res, next) => {           //edit mode get class information
        var response = {};
        var promiseList = [];
        promiseList[0] = s.classConn.getClassByMongoID(s.mongodb.ObjectID(req.body.classId)).then((clazz) => {
            if (clazz.owner.toString() == req.userLoginInfo.record._id.toString())
                response.result4classInfo = true;
            response.classInfo = clazz;
        }).catch((err) => {      //catch all the error from db
            response.result4classInfo = false;
            response.reason4classInfo = err || "error in get edit class info db operation";
        });
        promiseList[1] = s.classConn.getPrivilegeList(s.mongodb.ObjectID(req.body.classId)).then((privilegeList) => {
            response.result4Privilege = true;
            response.privilegeList = privilegeList;
        }).catch((err) => {
            response.result4privilege = false;
            response.reason4privilege = err || "error in get privilege list";
        });
        When.all(promiseList).then(() => {
            if (response.reason4classInfo || response.reason4privilege) {
                response.result = false;
                response.reason = (response.reason4privilege || '') + '\n' + (response.reason4classInfo || '');
                res.send({
                    result: false,
                    reason: (response.reason4privilege || '') + '\n' + (response.reason4classInfo || '')
                });
            } else {
                response.result = true;
                res.send(response);
            }
        })
    });

    // edit class info
    router.post('/ajax/edit-class', jsonParser, (req, res, next) => {           //response the edit class button
            s.classConn.getClassByMongoID(s.mongodb.ObjectID(req.body.classId)).then((clazz) => {
                if (clazz.owner.toString() != req.userLoginInfo.record._id.toString()) {
                    res.send({result: false, reason: "auth deny"});
                    return;
                }
                s.classConn.editClassByMongoID(s.mongodb.ObjectID(s.mongodb.ObjectID(req.body.classId)), {     //primise chain 0:modify class info 1:remove all privilege info
                    name: req.body.name,
                    startDate: req.body.startDate,
                    endDate: req.body.endDate
                });
                s.classConn.deletePrivilegeListByClassId(s.mongodb.ObjectID(req.body.classId)
                ).then(() => {       //return a premise list clazz = [clazzMongoID, result4deleteAllPrivilege]
                    return s.tools.listPromise(req.body.students, (email) => {              //add privilege info
                        return s.userConn.getUserByEmail(email).then((user) => {
                            if (user) {
                                return s.classConn.addStudentToClass(user._id, s.mongodb.ObjectID(req.body.classId));
                            } else {
                                var userID = s.mongodb.ObjectID();
                                return s.userConn.addUser(null, email, null, null, null, userID).then(() => {
                                    return s.classConn.addStudentToClass(userID, s.mongodb.ObjectID(req.body.classId));
                                });
                            }
                        });
                    });
                }).then((result) => {
                    res.send({result: true});
                }).catch((err) => {
                    res.status(400).send({result: false, reason: err.message ? err.message : 'unknown error'});
                });
            }).catch((e) => {
                res.status(400).send({
                    result: false,
                    reason: err.message || 'unknown error in get class by mongoid for privilege'
                });
            });
        }
    );

    // delete class
    router.post('/ajax/delete-class', jsonParser, (req, res, next) => {   //delete class with all the recitation and resource
        s.classConn.getClassByMongoID(s.mongodb.ObjectID(req.body.classId)).then((clazz) => {
            if (clazz.owner.toString() != req.userLoginInfo.record._id.toString()) {
                res.send({result: false, reason: "privilege deny"});
            } else {
                s.classConn.deleteClassByMongoID(s.mongodb.ObjectID(req.body.classId)).then(() => {
                    res.send({result: true});
                }).catch(() => {
                    res.status(400).send({result: false, reason: err.message || 'unknown error'});
                });
            }
        });
    });

    return router;
}
;
