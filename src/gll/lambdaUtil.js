const archiver = require('archiver');
const fs = require('fs');
const Q = require('Q');
const format = require('util').format;

const gll = require("./base.js");
const log = gll.log;
const lambda = new gll.configuredAWS.Lambda();
const paths = require('./paths.js');
const projectConfig = gll.projectConfig;

const qutils = require('./qutils.js');
const filter = qutils.filter;
const firstOrDefault = qutils.firstOrDefault;

exports.deploy = deploy;
exports.remove = remove;
exports.getFunction = getFunction;
exports.addInvokePermission = addInvokePermission;
exports.removePermission = removePermission;
exports.getPolicy = getPolicy;
exports.zip = zip;

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

function getPolicy(functionName) {
    return lambda.getPolicy({FunctionName: functionName}).promise()
        .get('Policy')
        .then(JSON.parse)
        .catch(function(err) {
            return null;
        })
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
    var deferred = Q.defer();
    fs.access(paths.sourceRootFor(functionName), function (err) {
        if (err) deferred.reject(new Error(err));
        else deferred.resolve(functionName)
    });
    return deferred.promise
}

function removePermission(functionName, sid) {
    gll.log("Removing %s", functionName);
    var params = {
        FunctionName: functionName,
        StatementId: sid
    };
    return lambda.removePermission(params).promise();
}

function addInvokePermission(functionName, sourceArn, statementId) {
    gll.log("Adding %s", functionName);
    var params = {
        Action: "lambda:InvokeFunction",
        Principal: "apigateway.amazonaws.com",
        FunctionName: functionName,
        SourceArn: sourceArn,
        StatementId: statementId,
    };
    return lambda.addPermission(params).promise();
}

function zip(functionName) {
    log("zipping %s", functionName)
    var deferred = Q.defer();


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
    return Q.nfcall(fs.readFile, zipFile);
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
