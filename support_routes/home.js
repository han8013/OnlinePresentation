var Express = require('express');
var BodyParser = require('body-parser');
var When = require('when'); // used by sequential callback

exports.getRoute = function (s) {
    var router = Express.Router();

    var urlParser = BodyParser.urlencoded({extended: false, limit: '10kb'});

    // home page
    router.get('/', urlParser, function (req, res, next) {
      res.render('home.ejs');
    });
    return router;
};
