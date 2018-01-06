var Express = require('express');
var Busboy = require('busboy');             //for upload files
var When = require('when');                 //promise
var gs = require('./ghost_script_wraper');  //ghostscript
var path = require('path');                 //modify path
var os = require('os');                     //get os tmp path
var fs = require('fs');                     //modify stream
var rimraf = require('rimraf');             //remove after

exports.getRoute = function (s) {
    var router = Express.Router();

    // add some resouces to database
    router.post('/add_resources', function (req, res, next) {
        var ended = false; // flag for output finish
        function writeError(status, err) {
            if (ended) return;
            res.status(status).send({result: false, error: err});
            ended = true;
        }

        var fields = {};
        fields.attachmentList = [];     //return to front to display added file(s)
        var attachmentPromises = [];    //attachment list
        var boy = new Busboy({          //create a new file upload manager
            headers: req.headers,
            limits: {fields: 50, fieldSize: 40 * 1024, files: 100, fileSize: 10 * 1024 * 1024, headerPairs: 1}
        });
        boy.on('file', function (fieldname, file, filename, encoding, mimetype) {       //when file update
            if (filename.length == 0) {
                writeError(400, 'file is zero byte');
                return file.pipe(BlackHole());
            }
            if (filename.match(/(.*)\.pdf$/)) {     //if the filename end with pdf
                var fileHeader = s.mongodb.ObjectID().toString();
                var filePath = path.join(os.tmpDir(), fileHeader);
                var uploadP = When.promise((resolve, reject) => {       //promise upload all the png
                    file.pipe(fs.createWriteStream(filePath + '.pdf')).once('finish', () => {
                        //get page number from gs with path and filename
                        gs().getPageNumber(filePath + '.pdf',
                            (pageNumber) => {
                                if (!pageNumber.success) {        // couldn't get page number
                                    return reject(new Error("couldn't get page number"));
                                }
                                var pages = parseInt(pageNumber.data);      //get page number for gs
                                gs().batch()
                                    .nopause()
                                    .device('png16m')
                                    .output(filePath + '-%d.png')
                                    .input(filePath + '.pdf')
                                    .exec((err, stdout, stderr) => {
                                      return sendAllPng2Mongodb(filename,filePath,pages,err,resolve);
                                    });
                            });
                    });
                }).catch((error)=>{
                    console.error(error);
                });
            } else {
                var fileID = s.mongodb.ObjectID();
                var uploadStream = s.resourceConn.getResourceFileBucket()
                    .openUploadStreamWithId(fileID, filename, {metadata: {}, contentType: mimetype});
                var uploadP = When.promise((resolve, reject) => {
                    file.on('limit', function () {
                        writeError(400, 'file is too large');
                        uploadStream.abort(function () {
                        });
                        return reject(new Error("error in file on limit"));
                    });
                    file.pipe(uploadStream).once('finish', function () {
                        fields.attachmentList.push({name: filename, id: fileID});
                        return resolve();
                    });
                });
            }
            attachmentPromises.push(uploadP);
        });

        boy.on('filesLimit', function () {
            writeError(400, 'too many files')
        });

        boy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            fields[fieldname] = val;
        });

        boy.on('fieldsLimit', function () {
            writeError(400, 'too many fields')
        });

        boy.on('finish', function () {
            if (ended) return;
            When.all(attachmentPromises).then(() => {
                res.send({result: true, files: fields.attachmentList});
            });
        });

        req.pipe(boy);

        function sendAllPng2Mongodb(filename,filePath,pages,err,resolve){
            fs.unlink(filePath+'.pdf');
            if (err) {            //err in convert
                return reject();
            }
            var pngsPromiseList = [];//promise list for all pngs save to mongodb
            for (var index = 1; index < pages + 1; index++) {
                //add png file one by one
                let fileID = s.mongodb.ObjectID();
                let pngName = filename + '-' + index + '.png';
                let pngPath = filePath + '-' + index + '.png';
                let file = fs.createReadStream(pngPath);
                fs.unlink(pngPath);
                fields.attachmentList[index - 1] = ({name: pngName, id: fileID});
                var uploadStream = s.resourceConn.getResourceFileBucket()
                    .openUploadStreamWithId(fileID, pngName, {
                        metadata: {},
                        contentType: 'image/png'
                    });
                pngsPromiseList.push(When.promise((resolve, reject) => {
                    file.pipe(uploadStream).once('finish', function () {
                        //upload stream to mongodb
                        return resolve();
                    });
                }).catch((err) => {
                    console.err(err.message || "err in pngs promise list id: " + fileID + ' number:' + index);
                }));
            }
            return When.all(pngsPromiseList).then(() => {
                return resolve();
            })
        }
    });

    // get a resource from database
    router.get('/get_resource', function (req, res, next) {
        try {
            var id = s.mongodb.ObjectID(req.query.id);
        } catch (e) {
            return res.status(400).send({result: true, reason: 'format error'});
        }
        var cursor = s.resourceConn.getResourceFileBucket().find({_id: id}, {}).limit(1);
        cursor.next(function (err, doc) {
            if (err) return res.status(400).send({result: false, error: 'database error', detail: err.message});
            if (doc == null) return res.status(400).send({result: false, error: 'file not found'});

            var outStream = s.resourceConn.getResourceFileBucket().openDownloadStream(doc._id);
            if (req.query.asAttachment) res.setHeader('Content-disposition', 'attachment; filename=' + doc.filename);
            res.setHeader('Content-length', doc.length.toString());
            if (doc.contentType) res.setHeader('Content-Type', doc.contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            outStream.pipe(res);
            cursor.close();
        });
    });

    return router;
};