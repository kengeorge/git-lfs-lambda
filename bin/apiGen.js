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
const forEach = qutils.forEach;
const qify = qutils.qify;

program.version(gll.projectConfig.version);

function prepareArguments(list, all) {
    return all
        ? Q.nfcall(fs.readdir, paths.functionSourceRoot())
        : qify(list);
}

program
//NOTE this will probably be the primary entry point
    .command('make-api <apiName>')
    .description('Produce swagger spec for specified api.')
    .action(function(apiName, options) {
        gateway.generateSpec(apiName)
            .then(qutils.peek)
            .done();
    });

program
    .command('remove-function [functionNames...]')
    .description('Remove specified function(s) from Lambda account.')
    .option('-a, --all', 'Remove all managed functions.')
    .action(function(functionNames, options) {
        prepareArguments(functionNames, options.all)
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
    });

program
    .command('deploy-function [functionNames...]')
    .description('Deploy specified function(s) to Lambda account.')
    .option('-a, --all', 'Deploy all managed functions.')
    .action(function(functionNames, options) {
        prepareArguments(functionNames, options.all)
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
            .done();
    });

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
        gateway.deploy(apiName)
            .then(function (results) {
                log("Api deployment results: %s", pretty(results));
            })
            .catch(function (err) {
                log("Could not deploy api %s: [%s]", apiName, err);
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

//TODO
function makeGatewayArn(awsRegion, accountId, apiId, methodType, resourcePath){
    return format("arn:aws:execute-api:%s:%s:%s/*/%s/%s",
        awsRegion, accountId, apiId, methodType, resourcePath);
}

function makeStatementId() {
    return "git-lfs-lambda-permissions-test";
}

