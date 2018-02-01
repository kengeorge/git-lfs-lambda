#!/usr/bin/env node
const Q = require('Q');
Q.longStackSupport = true;
const program = require('commander');
const fs = require('fs');
const format = require('util').format;

const gll = require('../src/gll/base.js');
const log = gll.log;
const pretty = gll.pretty;
const paths = require('../src/gll/paths.js')

const qutils = require('../src/gll/qutils.js');
const flatten = qutils.flatten;
const passTo = qutils.passTo;
const keyMap = qutils.keyMap;
const pull = qutils.pull;
const filter = qutils.filter;
const forEach = qutils.forEach;
const qify = qutils.qify;
const print = qutils.print;
const decorate = qutils.decorate;

const lambda = require('../src/gll/lambdaUtil.js');
const gateway = require('../src/gll/gatewayUtil.js');
const s3 = require('../src/gll/s3Util.js');
const cloud = require('../src/gll/cloudUtil.js');

program.version(gll.projectConfig.version);

function getAllFunctions(){
    return Q.nfcall(fs.readdir, paths.functionSourceRoot());
}

function configure(repoName) {
    return Q(gll.apiConfig)
        .then(function(apiConfig) {
            apiConfig.repoName = repoName;
            apiConfig.apiName = paths.apiNameForRepo(repoName);
            apiConfig.bucketName = paths.bucketNameForRepo(repoName);
            apiConfig.stackName = 'gllCloudStack';
            apiConfig.changeSetName = 'gllCloudChangeSet';
            return apiConfig;
        })
    ;
}

function fuckingDoIt(name, file) {
    return Q.nfcall(fs.readFile, file, 'utf-8');
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
            .then(print("Creating S3 bucket for deployment..."))
            .tap(function(instance) {
                return Q(instance)
                    .get('bucketName')
                    .then(s3.createBucket)
                    .catch(function (err) {
                        if (err.statusCode != 409) throw new Error(err);
                        log("Bucket [%s] already exists...", instance.bucketName)
                    })
                ;
            })

            .tap(decorate('lambdaFunctions', function(instance){
                return getAllFunctions()
                    .then(keyMap(lambda.zip))
                    .then(keyMap(function(name, zipFile) {
                        return Q.nfcall(fs.readFile, zipFile);
                    }))

                    .then(keyMap(function(name, bits) {
                        return s3.put(instance.bucketName, name, bits)
                            .then(function() {
                                return format("s3://%s/%s", instance.bucketName, name);
                            });
                    }))
                ;
            }))

            .then(function(instance) {
                return readTemplate()
                    //some fields in SAM template can't take parameters, so doing it myself
                    .then(passTo(replace, instance))
                    .then(print("Creating change set..."))
                    .then(passTo(cloud.createChangeSet, instance.bucketName, instance.repoName))
                    .then(print("Executing change set..."))
                    .then(cloud.executeChangeSet)
                    //TODO left off here - looks like it's running, but conflicting
                //          with the existing lambda functions (which is expected)
                //          probably want to deploy a function per stack so SAM can
                //          do all the most restrictive IAM mojo.
                //return cloud.waitFor('stackCreateComplete', {StackName: response.StackId}).promise();
            })

            .then(print('======== RESULT =========='))
            .tap(log)
            .then(print('========== END ==========='))
            .thenReject("Seriously, done")

            .done();


        return;
        configure(repoName)

            .then(print("Checking S3 bucket..."))
            .then(decorate('s3bucket', function(instance){
                return Q(instance)
                    .get('bucketName')
                    .tap(log)
                    .then(s3.getOrCreateBucket)
                    .tap(log)
                ;
            }))

            .then(print('Deploying functions...'))
            .then(decorate('lambdaFunctions', function(instance) {
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
            .then(decorate('apiObj', function(instance) {
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
            .then(decorate('permissions', function(instance) {
                return gateway
                    .getResources(instance.apiObj.id)
                    .then(forEach(pull('path', 'resourceMethods')))
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
                    .then(forEach(decorate('existingPolicy', function(param){
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
    .command('deploy-functions [functionNames]')
    .description('Deploy functions to Lambda account.')
    .option('-a, --all', 'Deploy all managed functions.')
    .action(function(functionNames, options) {
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
    return Q.nfcall(fs.readFile, "./template.yaml", "utf-8");
}

function replace(text, placeholderData) {
    while (match = text.match(/\$\{(\w+)\}/)) {
        var token = match[0];
        var symbol = match[1];
        var data = placeholderData[symbol];
        if (!data) throw new Error(format("Unknown token: >>> %s <<<", token));
        text = text.replace(token, data);
    }
    return text;
}
