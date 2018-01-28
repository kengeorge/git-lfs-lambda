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
const promiseFor = qutils.promiseFor;
const flatten = qutils.flatten;
const filter = qutils.filter;
const removeNulls = qutils.removeNulls;
const forEach = qutils.forEach;
const qify = qutils.qify;
const print = qutils.print;
const read = qutils.read;
const populate = qutils.populate;

program.version(gll.projectConfig.version);

function getAllFunctions(){
    return Q.nfcall(fs.readdir, paths.functionSourceRoot());
}

function configure(repoName) {
    return Q
        .nfcall(fs.readFile, "./apiConfig.json")
        .then(JSON.parse)
        .then(function(apiConfig) {
            apiConfig.apiName = format('%s%s', apiConfig.repoApiPrefix, repoName);
            apiConfig.repoName = repoName;
            return apiConfig;
        })
    ;
}

/**
 * This way-too-big process results in:
 * 1) All lambda functions being deployed (or updated) to the AWS region.
 * 2) An APIGateway API with the GIT-LFS specified structure and prefixed with the
 * requested repository name being added to the AWS region.
 * 3) Permission added on the API method calls to allow them to invoke the lambda functions.
 */
program
    .command('generate <repoName>')
    .description('Deploy a new git-lfs-lambda api based on apiConfig.json')
    .action(function(repoName, options) {

        configure(repoName)

            .then(print('Deploying functions...'))
            .then(populate('lambdaFunctions', function(instance) {
                return getAllFunctions()
                    .then(forEach(lambda.deploy))
                ;
            }))

            .then(print('Checking for existing API...'))
            .tap(function(instance) {
                return gateway
                    .getFirstApi(instance.apiName)
                    .tap(function(api) {
                        if(!api) {
                            log('%s not found.', instance.apiName);
                            return null;
                        }
                        log('Detected existing instance of %s, removing...', instance.apiName);
                        return gateway.remove(api);
                    })
                ;
            })

            .then(print('Compiling API spec...'))
            .then(populate('apiObj', function(instance) {
                return readTemplate()
                    .then(function(text) {
                        return replace(text, instance);
                    })
                    .then(JSON.parse)
                    .then(gateway.createFromSpec)
                    ;
            }))

            .then(print('Deploying api...'))
            .tap(function(instance) {
                return gateway
                    .deploy(instance.apiObj, instance.stage)
                ;
            })

            .then(print('Setting gateway permissions to lambda functions...'))
            .then(populate('permissions', function(instance) {
                return gateway
                    .getResources(instance.apiObj)
                    .then(forEach(read('path', 'resourceMethods')))
                    .then(filter(function(pair) { return pair.resourceMethods; }))
                    .then(forEach(function(pair) {
                        var ret = [];
                        for(var method in pair.resourceMethods) {
                            ret.push({
                                path: pair.path,
                                httpMethod: method,
                                uri: pair.resourceMethods[method].methodIntegration.uri
                            });
                        }
                        return ret;
                    }))
                    .then(flatten)
                    .then(forEach(function(method) {
                        //TODO seems weird to get names here again since we have them elsewhere in the instance context.
                        var functionName = method.uri
                            .match(/function:([^\s]+)\/invocations/)[1];
                        ;

                        //TODO I can *see* this arn on the APIGateway console method details page,
                        //  but canNOT friggin' figure out where to fetch it from, so let's just reconstruct it.
                        var sourceArn = format('arn:aws:execute-api:%s:%s:%s/*/%s%s',
                            instance.awsRegion,
                            instance.accountNumber,
                            instance.apiObj.id,
                            method.httpMethod,
                            method.path.replace(/\{id\}/, '*')
                        );

                        const statement = "git-lfs-generated-permission";

                        return {functionName: functionName, sourceArn: sourceArn, sid: statement};
                    }))
                    .then(forEach(populate('existingPolicy', function(param){
                        return lambda.getPolicy(param.functionName)
                            .then(function(policy) {
                                if(policy == null) return null;
                                for(var i = 0; i < policy.Statement.length; i++) {
                                    var s = policy.Statement[i];
                                    if(s.Sid == param.sid) return s;
                                }
                                return null;
                            })
                    })))
                    .tap(forEach(function(param) {
                        if(param.existingPolicy) {
                            return lambda.removePermission(param.functionName, param.sid);
                        }
                    }))
                    .then(forEach(function(param){
                        return lambda.addInvokePermission(param.functionName, param.sourceArn, param.sid);
                    }))
            }))
            .tap(log)
            .then(print("API Deployed!"))
            .done();
    })
;

//Dev use
program
    .command('get-policies [functionNames...]')
    .description('Fetch information on the specified function.')
    .option('-a, --all', 'Get policies for all managed functions.')
    .action(function(functionNames, options){
        var list = options.all ? getAllFunctions() : qify(functionNames);
        list
            .then(forEach(function(functionName) {
                return lambda.getPolicy(functionName)
                    .then(function(policy){
                        return {
                            name: functionName,
                            policy: policy
                        };
                    })
            }))
            .tap(log)
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
        gateway
            .getApis(apiName)
            .then(forEach(gateway.remove))
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
            .tap(log)
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
