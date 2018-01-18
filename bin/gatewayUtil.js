const Q = require('Q');
const fs = require('fs');
const lambda = require('./lambdaUtil.js');

const gll = require('./base.js');
const projectConfig = gll.projectConfig;
const templateText = gll.templateText;
const log = gll.log;
const pretty = gll.pretty;
const paths = gll.paths;
const format = require('util').format;
const forEach = gll.forEach;
const qify = gll.qify;

var args = process.argv.slice(2);
var command = args.shift().toLowerCase();

switch(command) {
    case "parse":
        Parse();
        break;
    default:
        log("Unknown command: %s", command);
        process.exit(1);
        break;
}

function readTemplate() {
    var deferred = Q.defer();
    fs.readFile("./template.json", "utf-8", function(err, data){
        if(err) deferred.reject(new Error(err));
        else deferred.resolve(data);
    });
    return deferred.promise;
}

function Parse() {
    return readTemplate()
        .then(function(data){
            log(data);
        });
}
