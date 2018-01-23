#!/usr/bin/env node
const Q = require('Q');
Q.longStackSupport = true;
const program = require('commander');
const fs = require('fs');
const lambda = require('../src/gll/lambdaUtil.js');
const gateway = require('../src/gll/gatewayUtil.js');
const format = require('util').format;

const gll = require('../src/gll/base.js');
const log = gll.log;
const pretty = gll.pretty;
const paths = gll.paths;

const qutils = require('../src/gll/qutils.js');
const passTo = qutils.passTo;
const peek = qutils.peek;
const forEach = qutils.forEach;
const qify = qutils.qify;
const print = qutils.print;
const fork = qutils.fork;
const read = qutils.read;
const populate = qutils.populate;

program.version(gll.projectConfig.version);

function getAllFunctions(){
    return Q.nfcall(fs.readdir, paths.functionSourceRoot());
}

function configure(repoName) {
    return Q
        .nfcall(fs.readFile, "./apiConfig.json")
        .then(passTo(JSON.parse))
        .then(function(apiConfig) {
            apiConfig.apiName = format('%s%s', apiConfig.repoApiPrefix, repoName);
            apiConfig.repoName = repoName;
            return apiConfig;
        })
    ;
}

program
    .command('generate <repoName>')
    .description('Deploy a new git-lfs-lambda api based on apiConfig.json')
    .action(function(repoName, options) {

        configure(repoName)

            .then(print('Deploying functions...'))
            .then(fork(function(instance) {
                return getAllFunctions()
                    .then(forEach(lambda.deploy))
                    .then(forEach(function (func) {
                        instance[func.FunctionName] = func;
                    }))
                ;
            }))

            .then(print('Compiling API spec...'))
            .then(populate('apiSpec', function(instance) {
                return readTemplate()
                    .then(passTo(replace, instance))
                    .then(passTo(JSON.parse))
                ;
            }))


            .then(print('Checking for existing API...'))
            .then(fork(function(instance) {
                return gateway
                    .getFirstApi(instance.apiName)
                    .then(fork(function(api) {
                        if(!api) {
                            log('%s not found.', instance.apiName);
                            return null;
                        }
                        log('Detected existing instance of %s, removing...', instance.apiName);
                        return gateway.remove(api);
                    }))
                ;
            }))

            .then(print('Creating api...'))
            .then(populate('apiObj', function(instance) {
                return gateway
                    .createFromSpec(instance.apiSpec)
                    ;
            }))

            .then(print('Deploying api..'))
            .then(fork(function(instance) {
                return gateway
                    .deploy(instance.apiObj, instance.stage)
                ;
            }))

            .then(print('Setting gateway permissions to lambda functions...'))
            .then(print('TODO'))

            .then(print("Done!"))
            .done();

    })
;

function fakeDeploy(functionName) {
    return {
        "FunctionName": functionName,
        "FunctionArn": "arn:aws:lambda:us-west-2:548425624042:function:" + functionName + ":11",
        "Runtime": "nodejs6.10",
        "Role": "arn:aws:iam::548425624042:role/service-role/git-lfs-service",
        "Handler": "verifyLocks.handler",
        "CodeSize": 859,
        "Description": "",
        "Timeout": 3,
        "MemorySize": 128,
        "LastModified": "2018-01-19T20:03:17.158+0000",
        "CodeSha256": "EmcGdZ5Fk/9dhMiZ8jik8vtQPifd0zwkU6+qQ4y0xzg=",
        "Version": "11",
        "KMSKeyArn": null,
        "TracingConfig": {
            "Mode": "PassThrough"
        },
        "MasterArn": null
    };
}

program
    .command('get-function <functionName>')
    .description('Fetch information on the specified function.')
    .action(function(functionName, options){
        lambda.get(functionName)
            .then(qutils.peek)
            .done();
    })
;

function deployAllFunctions() {
    return getAllFunctions()
        .then(forEach(function (functionName) {
            //return lambda.deploy(functionName)
            return Q.fcall(function () { return {FunctionName: functionName, FunctionArn: "dry run"};
                })
                .then(function (result) {
                    return format("Function [%s] deployed as [%s]", result.FunctionName, result.FunctionArn);
                })
                .catch(function (err) {
                    return format("Could not deploy function %s: [%s]", functionName, err);
                })
                ;
        }))
        .then(function (results) {
            log("Function deployment results: %s", pretty(results));
        })
        ;
}



//"arn:aws:apigateway:${awsRegion}:lambda:path/2015-03-31/functions/arn:aws:lambda:${awsRegion}:${accountNumber}:function:listLocks/invocations"
//"arn:aws:apigateway:{region}:{subdomain.service|service}:path|action/{service_api}"

program
    .command('remove-function [functionNames...]')
    .description('Remove specified function(s) from Lambda account.')
    .option('-a, --all', 'Remove all managed functions.')
    .action(function(functionNames, options) {
        var list = options.all ? getAllFunctions() : qify(functionNames);
        list
            .then(forEach(function (functionName) {
                return lambda.remove(functionName)
                    .then(function (response) {
                        return format("Function [%s] removed.", functionName);
                    })
                    .catch(function (err) {
                        return format("Could not remove function %s: [%s]", functionName, err);
                    })
                    ;
            }))
            .then(function (results) {
                log("Function removal results:\n%s", pretty(results));
            })
            .done();
    })
;

program
    .command('deploy-functions')
    .description('Deploy functions to Lambda account.')
    .action(function() {
        var list = options.all ? getAllFunctions() : qify(functionNames);
        list
            .then(forEach(function (functionName) {
                return lambda.deploy(functionName)
                    .then(function (result) {
                        return format("Function [%s] deployed as [%s]", result.FunctionName, result.FunctionArn);
                    })
                    .catch(function (err) {
                        return format("Could not deploy function %s: [%s]", functionName, err);
                    })
                    ;
            }))
            .then(function (results) {
                log("Function deployment results: %s", pretty(results));
            })
        ;
    })
;

program
    .command('deploy-api <apiName>')
    .description('Deploy specified api to APIGateway account.')
    .action(function(apiName, options) {
        gateway.remove(apiName)
            .then(function(response) {
                log("Api removal results: %s", pretty(response));
            })
            .catch(function (err) {
                log("Could not remove api %s: [%s]", apiName, err);
            })
            .done();
    });

program
    .command('remove-api <apiName>')
    .description('Remove specified api from APIGateway account.')
    .action(function(apiName, options) {
        gateway.remove(apiName)
            .then(function (results) {
                log("Api removal results: %s", pretty(results));
            })
            .catch(function (err) {
                log("Could not remove api %s: [%s]", apiName, err);
            })
            .done();
    });

program
    .command('read-api <apiName>')
    .description('Fetch swagger spec for the specified api.')
    .action(function(apiName, options){
        gateway.getFirstApi(apiName)
            .then(gateway.getApiSpec)
            .then(qutils.peek)
            .done();
    });

program
    .command('*')
    .action(function(env){
        console.log("No valid command found.")
        program.outputHelp();
    });
program.parse(process.argv);
if(process.argv.slice(2).length <= 0) {
    console.log("No valid command found.")
    program.outputHelp();
}

//TODO
function makeGatewayArn(awsRegion, accountId, apiId, methodType, resourcePath){
    return format("arn:aws:execute-api:%s:%s:%s/*/%s/%s",
        awsRegion, accountId, apiId, methodType, resourcePath);
}

function makeStatementId() {
    return "git-lfs-lambda-permissions-test";
}

function readTemplate() {
    return Q.nfcall(fs.readFile, "./api_template.json", "utf-8");
}

function replace(text, placeholderData) {
    while(match = text.match(/\$\{(\w+)\}/)) {
        var token = match[0];
        var symbol = match[1];
        var data = placeholderData[symbol];
        if(!data) throw new Error(format("Unknown token: >>> %s <<<", token));
        text = text.replace(token, data);
    }
    return text;
}
