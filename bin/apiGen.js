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
const qCall = gll.qCall;
const read = gll.read;
const peek = gll.peek;
const filter = gll.filter;


//TODO temp for testing/dev
const L = new gll.configuredAWS.Lambda();
const G = new gll.configuredAWS.APIGateway();

var args = process.argv.slice(2);

function getPolicy(functionName) {
    return L.getPolicy({FunctionName: functionName}).promise()
        .then(function (response) {
            return JSON.parse(response.Policy);
        })
        ;
}

function test(apiName, resourcePath, method, payload){
    return gateway.getApi(apiName)
        .then(read('id'))
        .then(function(apiId){
            return G.getResources({restApiId: apiId}).promise()
                .then(read('items'))
                .then(filter(function(item) { return item.path == resourcePath;}))
                .then(read('0'))
                .then(read('id'))
                .then(function(resource) {
                    return testInvoke(apiId, resource, method, payload);
                })
                .then(read('body'))
                .then(qCall(JSON.parse))
            ;
        })
    ;
}

function testInvoke(apiId, resourceId, method, payload) {
    var params = {
        restApiId: apiId,
        resourceId: resourceId,
        httpMethod: method,
        body: JSON.stringify(payload),
        headers: {
        },
        stageVariables: {
        }
    };
    return G.testInvokeMethod(params).promise();
}

function addInvokePermission(apiId) {
    var arn = makeGatewayArn(
        gll.projectConfig.awsRegion,
        "548425624042",
        apiId,
        "POST",
        "myrepo.git/info/lfs/locks"
    );
    var params = {
        Action: "lambda:InvokeFunction",
        FunctionName: functionName,
        Principal: "apigateway.amazonaws.com",
        StatementId: makeStatementId(),
        SourceArn: arn
    };
    return L.addPermission(params).promise()
        .then(qCall(JSON.Parse))
    ;
}

function makeGatewayArn(awsRegion, accountId, apiId, methodType, resourcePath){
    return format("arn:aws:execute-api:%s:%s:%s/*/%s/%s",
        awsRegion, accountId, apiId, methodType, resourcePath);
}

function makeStatementId() {
    return "git-lfs-lambda-permissions-test";
}


function getEventSourceMappings(functionName){
    var params = {
        FunctionName: functionName
    };
    return L.listEventSourceMappings(params).promise();
}

var apiName = args[0];
var resourcePath = args[1];
var methodType = "POST";
var payload = {
    path: "foo/bar.zip",
    ref: {
        name: "refs/heads/my-feature"
    }
}

test(apiName, resourcePath, methodType, payload)
    .then(peek)
.done();

/*
THIS IS FUNCTIONAL; MOVE TO PROPER HOME
gateway.getApi(apiName)
    .then(peek)
    .then(read('id'))
    .then(addInvokePermission)
    .catch(function(err){
        log("Could not add permission: %s", err);
    })
    .then(function(whatever) {
        return getPolicy(functionName);
    })
    .then(peek)
    .done()
;
*/

function getMethod(method, resourceId, apiId) {
    var params = {
        httpMethod: method,
        resourceId: resourceId,
        restApiId: apiId,
    };
    return G.getMethod(params).promise();
}

function ugh() {
    gateway.getApi(apiName)
        .then(function (api) {
            return gateway.getResources(apiName)
                .then(function (resources) {
                    for (var k in resources) {
                        var res = resources[k];
                        if (res.path == "/myrepo.git/info/lfs/locks") {
                            return res;
                        }
                    }
                    throw new Error("Can't find path /myrepo.git/info/lfs/locks");
                })
                .then(function (resource) {
                    return getMethod(methodType, resource.id, api.id);
                })
                .then(function (resource) {
                    log(pretty(resource));
                });
        })
        .done()
    ;
}

if(false) {
    var command = args.shift();
    if(command) command = command.toLowerCase();
    var type = args.shift();
    if(type) type = type.toLowerCase();
    var action = format("%s-%s", command, type);

    switch (action) {
        case "clean-functions":
            getList(args)
                .then(forEach(cleanFunction))
                .then(function (results) {
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


        case "clean-api":
            cleanApi(args[0])
                .then(function (results) {
                    log("Api removal results: %s", pretty(results));
                })
                .done();
            break;


        case "deploy-api":
            deployApi(args[0])
                .then(function (results) {
                    log("Api deployment results: %s", pretty(results));
                })
                .done();
            break;

        case "read-api":
            gateway.getApiSpec(args[0])
                .then(function (spec) {
                    log(pretty(spec));
                })
                .done()
            ;
            break;

        case "generate-api":
            gateway.generateSpec(args[0])
                .then(function (r) {
                    log(pretty(r));
                })
                .done()
            ;
            break;

        default:
            log("Unknown operation %s", action);
            process.exit(1);
            break;
    }
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
