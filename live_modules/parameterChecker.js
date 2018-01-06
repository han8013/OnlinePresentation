const Validator = require("better-validator");

const validator = new Validator();

const getResourceRule = (obj) => {
    obj.required().isObject((obj)=>{
        obj('resources').required().isObjectArray((obj)=>{
            obj("type").required().isString();
            obj("content").required()
        });
    });
};

const privilegeObjectRule = (obj) =>{
    obj.required().isObject((obj)=>{
        obj('*').isArray((obj)=>{
            obj().isString();
        });
    });
};

const dispatchClassroomRule = (obj)=>{
    obj.required().isObject((obj)=>{
        obj('classNumber').required().isNumber().isPositive();
        obj('privilege').required().check(privilegeObjectRule);
        obj('name').required().isString();
        obj('startDate').required().isString().isISO8601();
        obj('endDate').required().isString().isISO8601();
        obj('status').required().isString();
        obj('userList').required().isObject();
    });
};

exports.privilegeObjectTest = function (privilege) {
    var result = validator(privilege, privilegeObjectRule);
    return result.length == 0;
};
exports.dispatchRequest = function (req) {
    var result = validator(req, dispatchClassroomRule);
    return result.length == 0;
};

exports.transactionPush = function (req) {
    return (
        typeof req.index == 'number' &&
        typeof req.module == 'string'
    );
    // For later development: check object safety
};

exports.getResource = function (req) {
    return validator(req, getResourceRule).length = 0;
};