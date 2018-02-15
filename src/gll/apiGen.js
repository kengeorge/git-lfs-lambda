#!/usr/bin/env node
const Q = require('Q');
Q.longStackSupport = true;
const program = require('commander');
const fs = require('fs');
const format = require('util').format;

const gll = require('./base.js');
const log = gll.log;
const pretty = gll.pretty;
const paths = require('./paths.js')

const qutils = require(paths.apiCommonRoot('qutils.js'));
const passBefore = qutils.passBefore;
const forEach = qutils.forEach;
const qify = qutils.qify;
const using = qutils.using;
const print = qutils.print;
const decorate = qutils.decorate;

const lambda = require('./lambdaUtil.js');
const s3 = require('./s3Util.js');
const cloud = require('./cloudUtil.js');

program.version("v0.1");

function getAllFunctions() {
    return Q([
        "batch",
        "verifyLocks",
        "listLocks",
        "createLock",
        "deleteLock",
    ]);
}

function configure(repoName) {
    return Q(gll.apiConfig)
        .then(function (config) {
            config.repoName = repoName;
            config.bucketName = format(config.formats.bucketNameForRepo, repoName).toLowerCase();
            config.apiName = format(config.formats.apiNameForRepo, repoName).toLowerCase();
            config.stackName = format(config.formats.stackNameForRepo, repoName).toLowerCase();
            config.changeSetName = format(config.formats.changeSetNameForRepo, repoName).toLowerCase();
            config.deploymentBucket = config.formats.deploymentBucketName.toLowerCase();
            return config;
        })
        ;
}

program
    .command('generate <repoName>')
    .description('Deploy a new git-lfs-lambda api based on gllConfig.json')
    .action(function (repoName, options) {

        configure(repoName)
            .then(print("Creating S3 bucket for deployment..."))
            .tap(using('deploymentBucket', bucketName =>
                s3.createBucket(bucketName)
                    .catch(function (err) {
                        if (err && err.statusCode != 409) throw new Error(err);
                        log("Bucket [%s] already exists...", bucketName)
                    })
            ))

            .then(print("Uploading lambda functions..."))
            .tap(decorate('batchUri', instance => upload('batch', instance.deploymentBucket)))
            .tap(decorate('verifyLocksUri', instance => upload('verifyLocks', instance.deploymentBucket)))
            .tap(decorate('listLocksUri', instance => upload('listLocks', instance.deploymentBucket)))
            .tap(decorate('createLockUri', instance => upload('createLock', instance.deploymentBucket)))
            .tap(decorate('deleteLockUri', instance => upload('deleteLock', instance.deploymentBucket)))

            .tap(decorate('template', compileTemplate))

            .tap(log)

            .then(print("Creating change set..."))
            .then(instance => cloud.createChangeSet(instance.template, instance))

            .then(print("Executing change set..."))
            .then(cloud.executeChangeSet)

            .then(print('========= RESULT =========='))
            .tap(log)
            .then(print('========== DONE ==========='))
            .done();
    });

function upload(functionName, bucketName) {
    return lambda.zip(functionName)
        .then(function (zipFile) {
            return Q.nfcall(fs.readFile, zipFile);
        })
        .then(passBefore(s3.put, bucketName, functionName + ".zip"))
        .then(function () {
            return format("s3://%s/%s.zip", bucketName, functionName);
        })
        ;
}

function compileTemplate(data) {
    return Q.nfcall(fs.readFile, paths.templateFile(), "utf-8")
    //some fields in SAM template can't take parameters, so doing it myself
        .then(passBefore(replace, data))
        ;
}

program
    .command('do')
    .description('Does whatever I need it to do at the moment...')
    .action(function () {
        return s3.getUrl("git-lfs-lambda-cloudrepo", "mytest")
            .tap(log)
            .done();
    });

program
    .command('delete-stack <repoName>')
    .action(function (repoName, options) {
        configure(repoName)
            .get('stackName')
            .then(print("Attempting to delete stack..."))
            .then(cloud.deleteStack)
            .then(print("Deletion complete."))
            .done();
    });

program
    .command('compile-template <repoName>')
    .description('Compile the SAM template file for the given repo name.')
    .option('-l, --local', 'Compile for SAM local.')
    .action(function (repoName) {
        configure(repoName)
            .tap(decorate('batchUri', qutils.value(".")))
            .tap(decorate('verifyLocksUri', qutils.value(".")))
            .tap(decorate('listLocksUri', qutils.value(".")))
            .tap(decorate('createLockUri', qutils.value(".")))
            .tap(decorate('deleteLockUri', qutils.value(".")))
            .then(compileTemplate)
            .tap(log)
            .done();
    });


program
    .command('remove-function [functionNames...]')
    .description('Remove specified function(s) from Lambda account.')
    .option('-a, --all', 'Remove all managed functions.')
    .action(function (functionNames, options) {
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
    });

program
    .command('deploy-functions [functionNames]')
    .description('Deploy functions to Lambda account.')
    .option('-a, --all', 'Deploy all managed functions.')
    .action(function (functionNames, options) {
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
    .command('*')
    .action(function (env) {
        console.log("No valid command found.")
        program.outputHelp();
    });
program.parse(process.argv);
if (process.argv.slice(2).length <= 0) {
    console.log("No valid command found.")
    program.outputHelp();
}

function replace(text, placeholderData) {
    for (var key in placeholderData) {
        var data = placeholderData[key];
        var pattern = new RegExp("\\$\\{" + key + "\\}");
        while (match = text.match(pattern)) {
            var token = match[0];
            if (data) text = text.replace(token, data);
        }
    }
    return text;
}
