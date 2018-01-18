const Q = require('Q');
const fs = require('fs');
const lambda = require('./lambdaUtil.js');

const gll = require('./base.js');
const log = gll.log;
const pretty = gll.pretty;
const paths = gll.paths;
const format = require('util').format;
const forEach = gll.forEach;
const qify = gll.qify;

var args = process.argv.slice(2);
var command = args.shift().toLowerCase();

switch(command) {
    case "clean":
        getList(args)
            .then(forEach(clean))
            .then(function(results) {
                log("Clean results:\n%s", pretty(results));
            })
            .done();

        break;
    case "deploy":
        getList(args)
            .then(forEach(deploy))
            .then(function (results) {
                log("Deployment results: %s", pretty(results));
            })
            .done();
        break;
    default:
        log("Uknown operation %s", command);
        process.exit(1);
        break;
}

function getList(args) {
    if (args && args.length > 0) {
        return Q.fcall(function () {
            return args;
        });
    };
    return readDirs();
}

function readDirs(){
    var deferred = Q.defer();
    fs.readdir(paths.functionSourceRoot(), function(err, data) {
        if(err) deferred.reject(new Error(err));
        else deferred.resolve(data);
    });
    return deferred.promise;
}

function clean(functionName) {
    return lambda.remove(functionName)
        .then(function (response) {
            return format("Function [%s] removed.", functionName);
        })
        .catch(function(err) {
            return format("Could not remove function %s: [%s]", functionName, err);
        });
}

function deploy(functionName) {
    return lambda.deploy(functionName)
        .then(function(result){
            return format("Function [%s] deployed as [%s]", result.FunctionName, result.FunctionArn);
        })
        .catch(function (err) {
            return format("Could not deploy function %s: [%s]", functionName, err);
        });
}