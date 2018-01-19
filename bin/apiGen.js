const Q = require('Q');
const fs = require('fs');
const lambda = require('./lambdaUtil.js');
const gateway = require('./gatewayUtil.js');

const gll = require('./base.js');
const log = gll.log;
const pretty = gll.pretty;
const paths = gll.paths;
const format = require('util').format;
const forEach = gll.forEach;

var args = process.argv.slice(2);
var command = args.shift().toLowerCase();
var type = args.shift().toLowerCase();
var action = format("%s-%s", command, type);

log(action);
switch(action) {
    case "clean-functions":
        getList(args)
            .then(forEach(cleanFunction))
            .then(function(results) {
                log("Function removal results:\n%s", pretty(results));
            })
            .done();

        break;


    case "deploy-functions":
        getList(args)
            .then(forEach(deployFunction))
            .then(function (results) {
                log("Function deployment results: %s", pretty(results));
            })
            .done();
        break;


    case "clean-apis":
        cleanApi(args[0])
            .then(function (results) {
                log("Api removal results: %s", pretty(results));
            })
            .done();
        break;


    case "deploy-apis":
        deployApi(args[0])
            .then(function (results) {
                log("Api deployment results: %s", pretty(results));
            })
            .done();
        break;


    default:
        log("Uknown operation %s", action);
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

function cleanFunction(functionName) {
    return lambda.remove(functionName)
        .then(function (response) {
            return format("Function [%s] removed.", functionName);
        })
        .catch(function(err) {
            return format("Could not remove function %s: [%s]", functionName, err);
        });
}

function deployFunction(functionName) {
    return lambda.deploy(functionName)
        .then(function(result){
            return format("Function [%s] deployed as [%s]", result.FunctionName, result.FunctionArn);
        })
        .catch(function (err) {
            return format("Could not deploy function %s: [%s]", functionName, err);
        });
}

function cleanApi(apiName) {
    return gateway.remove(apiName)
        .then(function(response){
            return format("Api [%s] removed.", apiName);
        })
        .catch(function (err) {
            return format("Could not remove api %s: [%s]", apiName, err);
        });
}

function deployApi(apiName) {
    return gateway.deploy(apiName)
        .then(function(result){
            return format("Api [%s] deployed.", result.name);
        })
        .catch(function (err) {
            return format("Could not deploy api %s: [%s]", apiName, err);
        })
    ;
}
