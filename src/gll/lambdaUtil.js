const fs = require('fs');
const format = require('util').format;

const gll = require("./base.js");
const lambda = new gll.configuredAWS.Lambda();
const paths = require('./paths.js');
const projectConfig = gll.projectConfig;

exports.deploy = deploy;
exports.remove = remove;
exports.getFunction = getFunction;

function deploy(functionName) {
    return verify(functionName)
        .then(zip)
        .then(readZipBits)
        .then(function (zipData) {
            return checkForExisting(functionName)
                .then(function (exists) {
                    return exists
                        ? updateFunction(zipData, functionName)
                        : createNewFunction(zipData, functionName);
                })
        })
    ;
}

function getFunction(functionName) {
    return lambda.listFunctions({}).promise()
        .get('Functions')
        .then(filter(function(f) {
            return f.FunctionName == functionName;
        }))
        .then(firstOrDefault)
    ;
}

function remove(functionName) {
    return verify(functionName)
        .catch(function(err) {
            throw new Error(format("%s does not appear to be managed by gll, skipping.", functionName));
        })
        .then(function(name) {
            return lambda.deleteFunction({FunctionName: name}).promise();
        });
}

function verify(functionName) {
    return Q.nfcall(fs.access, paths.sourceFileForFunction(functionName));
}


function checkForExisting(functionName) {
    var deferred = Q.defer();
    lambda.listFunctions().promise()
        .then(function (listing) {
            for (var key in listing.Functions) {
                var func = listing.Functions[key];
                if (func.FunctionName == functionName) {
                    deferred.resolve(true);
                    return;
                }
            }
            deferred.resolve(false);
        });
    return deferred.promise;
}

function updateFunction(zipFile, functionName) {
    gll.log("Updating existing function %s", functionName);
    var params = {
        FunctionName: functionName,
        Publish: true,
        ZipFile: zipFile,
    };
    return lambda.updateFunctionCode(params).promise();
}

function createNewFunction(zipFile, functionName) {
    gll.log("Creating new function %s", functionName);
    var params = {
        FunctionName: functionName,
        Handler: format("%s.%s", functionName, "handler"),
        Publish: true,
        Code: {
            ZipFile: zipFile
        },
        Runtime: projectConfig.functionRuntime,
        Role: projectConfig.lambdaRoleArn
    };
    return lambda.createFunction(params).promise();
}
