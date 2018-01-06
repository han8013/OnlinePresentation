var Express = require('express');

exports.getRoute = function (s) {
    var router = Express.Router();

    // index all files in support routes
    router.use('/', require('./home').getRoute(s));
    router.use('/', require('./classroom').getRoute(s));
    router.use('/', require('./user').getRoute(s));
    router.use('/', require('./recitation').getRoute(s));
    router.use('/', require('./file').getRoute(s));

    return router;
};