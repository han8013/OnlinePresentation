var exec = require('child_process').exec; //run ghost script
var os = require('os');                   //get type of the server computer for different cmd

/**
 * builder
 * @returns {gs}
 */
var create = function () {
    return new gs();
};

/**
 * create a new obj
 */
var gs = function () {
    this.options = [];
    this._input = null;
};

/**
 * add options -dbatch
 * @returns {gs}
 */
gs.prototype.batch = function () {
    this.options.push('-dBATCH');
    return this;
};

gs.prototype.device = function (device) {
    device = device || 'jpeg';
    this.options.push('-sDEVICE=' + device);
    return this;
};

gs.prototype.exec = function (callback) {
    var self = this;
    if (!this._input) return callback("Please specify input");
    var args = this.options.concat([this._input]).join(' ');
    exec((os.platform() == 'win32' ? 'gswin64c ' : 'gs ')  + args, function (err, stdout, stderr) {
        callback(err, stdout, stderr);
    });
};

gs.prototype.getPageNumber = (name, callback) => {
        var cmd = (os.platform() == 'win32' ? 'gswin64c' : 'gs') +
            ' -q -dNODISPLAY -c "(' + name.replace(/\\/g, "/") +
            ') (r) file runpdfbegin pdfpagecount = quit"';
    exec(cmd, function (error, stdout, stderr) {
        if (error !== null) {
            //console.log("Error reading pdf: " + error);
            callback({success: false, error: "Error reading pdf: " + error});
            return;
        }

        // Remove line break (\n) at the end
        var pageCount = stdout.substr(0, stdout.length - 1);
        callback({success: true, data: pageCount});
    });
};

gs.prototype.input = function (file) {
    this._input = file;
    return this;
};

gs.prototype.jpegq = function (value) {
    value = value || 75;
    this.options.push('-dJPEGQ=' + value);
    return this;
};

gs.prototype.nopause = function () {
    this.options.push('-dNOPAUSE');
    return this;
};

gs.prototype.output = function (file) {
    file = file || '-';
    this.options.push('-sOutputFile=' + file);
    if (file === '-') return this.quiet();
    return this;
};

gs.prototype.q = gs.prototype.quiet;

gs.prototype.quiet = function () {
    this.options.push('-dQUIET');
    return this;
};

gs.prototype.resolution = function (xres, yres) {
    this.options.push('-r' + xres + (yres ? 'x' + yres : ''));
    return this;
};

gs.prototype.r = gs.prototype.res = gs.prototype.resolution;

module.exports = create;