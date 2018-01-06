// some logging utility

exports.debug = function (message) {
    if(s.inProduction) return;
    if(typeof message == "function")
        console.log(message());
    else
        console.log(message);
};

exports.warning= function (message){
    if(s.inProduction) return;
    if(typeof message == "function")
        console.log(message());
    else
        console.log(message);
};

exports.error= function (message){
    if(s.inProduction) return;
    if(typeof message == "function")
        console.error(message());
    else
        console.error(message);
};