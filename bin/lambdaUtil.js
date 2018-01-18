const archiver = require('archiver');
const fs = require('fs');
const Q = require('Q');

const gll = require("./base.js");
const log = gll.log;
const lambda = new gll.configuredAWS.Lambda();
const paths = gll.paths;

exports.deploy = function(functionName) {
    return zip(functionName)
        .then(readZipBits)
        .then(function (zipData) {
            return checkForExisting(functionName)
                .then(function (exists) {
                    return exists
                        ? updateFunction(zipData, functionName)
                        : createNewFunction(zipData, functionName);
                })
        });
}

exports.remove = function(functionName) {
    return lambda.deleteFunction({FunctionName: functionName}).promise();
}

function zip(functionName) {
    var deferred = Q.defer();

    log("Zipping %s", functionName);
    var outfilePath = paths.deploymentPackageFor(functionName);
    var functionDir = paths.sourceRootFor(functionName);

    var output = fs.createWriteStream(outfilePath);
    output.on('end', function() {
        log("Done writing for %s", outfilePath);
    });
    output.on('close', function () {
        log("%s zipped with %s bytes.", outfilePath, archive.pointer());
        deferred.resolve(outfilePath);
    });

    var archive = archiver('zip');
    archive.on('warning', function(warn) {
        if(warn.code === 'ENOENT') {
            log(warn);
        } else {
            deferred.reject(new Error(warn));
        }
    });
    archive.on('error', function (err) {
        log("Error writing zip file %s: %s", outfilePath, err);
        deferred.reject(new Error(err));
    });

    archive.pipe(output);

    archive.directory(functionDir, './');
    archive.directory(paths.commonRoot(), './common');
    archive.finalize();

    return deferred.promise;
}

function readZipBits(zipFile) {
    var deferred = Q.defer();
    fs.readFile(zipFile, function(err, data){
        if(err) deferred.reject(new Error(err));
        else deferred.resolve(data);
    });
    return deferred.promise;
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
    log("Updating existing function %s", functionName);
    var params = {
        FunctionName: functionName,
        Publish: true,
        ZipFile: zipFile,
    };
    return lambda.updateFunctionCode(params).promise();
}

function createNewFunction(zipFile, functionName) {
    log("Creating new function %s", functionName);
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
