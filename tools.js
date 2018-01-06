var GoogleAuth = require('google-auth-library');
var When = require('when');

var auth = new GoogleAuth;


exports.getToolSet = function (s) {
    var tools = {};

    tools.isAllString = function (obj) {
        for(var key in obj){
            if (!obj.hasOwnProperty(key)) continue;
            if(typeof obj[key] !== 'string') return false;
        }
        return true;
    };

    tools.listPromise = function(sourceList, queryFunction){
        var promiseList = [];
        sourceList.forEach((source, index)=>{
            promiseList[index] = queryFunction(source);
        });
        return When.all(promiseList);
    };

    tools.isJson = function (str) {
        return /^[\],:{}\s]*$/.test(text.replace(/\\["\\\/bfnrtu]/g, '@')
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
            .replace(/(?:^|:|,)(?:\s*\[)+/g, ''));
    };

    return tools;
};