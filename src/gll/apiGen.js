#!/usr/bin/env node
const program = require('commander');
const fs = require('fs');
const format = require('util').format;

const gll = require('./base.js');
const paths = require('./paths.js')

const s3 = require('./s3Util.js');
const cloud = require('./cloudUtil.js');

const replace = require('./textReplace');

const K = require('kpromise');
const startWith = K.startWith;
const decorate = K.decorate;
const print = K.print;
const peek = K.peek;
const tap = K.tap;
const log = K.log;
const promise = K.promise;
const passBefore = K.passBefore;
const get = K.get;

const zip = require('./zip');

function startRepoConfigFor(repoName) {
    return startWith(gll.apiConfig)
        .then(config => {
            config.repoName = repoName;
            config.bucketName = format(config.formats.bucketNameForRepo, repoName).toLowerCase();
            config.apiName = format(config.formats.apiNameForRepo, repoName).toLowerCase();
            config.stackName = format(config.formats.stackNameForRepo, repoName).toLowerCase();
            config.changeSetName = format(config.formats.changeSetNameForRepo, repoName).toLowerCase();
            config.deploymentBucket = config.formats.deploymentBucketName.toLowerCase();
            return config;
        });
}

function upload(functionName, bucketName) {
    //TODO left off here: need to pull in the files from their new location in another package
    return zip.zip(functionName)
        .then(zip.readBits)
        .then(passBefore(s3.put, bucketName, functionName + ".zip"))
        .then(() => format("s3://%s/%s.zip", bucketName, functionName));
}

function compileTemplate(fillData) {
    return promise((res, rej) => {
        fs.readFile(paths.templateFile(), "utf-8", (err, data) => {
            if(err) rej(err);
            else res(data);
        });
    })
        .then(passBefore(replace, fillData));
}

program
    .command('generate <repoName>')
    .description('Deploy a new git-lfs-lambda repo')
    .action((repoName) => {

        startRepoConfigFor(repoName)
            .then(print("Creating S3 bucket for deployment..."))
            .then(tap((config) => {
                return startWith(config)
                    .then(get('deploymentBucket'))
                    .then(s3.createBucket)
                    .catch((err) => {
                        if(err && err.statusCode != 409) throw new Error(err);
                        log("Bucket already exists.");
                    });
            }))

            .then(print("Uploading lambda functions..."))
            .then(decorate('batchUri', instance => upload('batch', instance.deploymentBucket)))
            .then(decorate('verifyObjectUri', instance => upload('verifyObject', instance.deploymentBucket)))
            .then(decorate('verifyLocksUri', instance => upload('verifyLocks', instance.deploymentBucket)))
            .then(decorate('listLocksUri', instance => upload('listLocks', instance.deploymentBucket)))
            .then(decorate('createLockUri', instance => upload('createLock', instance.deploymentBucket)))
            .then(decorate('deleteLockUri', instance => upload('deleteLock', instance.deploymentBucket)))

            .then(decorate('template', compileTemplate))

            /*
            .then(print("Creating change set..."))
            .then(instance => cloud.createChangeSet(instance.template, instance))

            .then(print("Executing change set..."))
            .then(cloud.executeChangeSet)
            */

            .then(print('========= RESULT =========='))
            .then(peek)
            .then(print('========== DONE ==========='));
    });


program
    .command('delete-stack <repoName>')
    .action((repoName) => {
        startRepoConfigFor(repoName)
            .then(get('stackName'))
            .then(print("Attempting to delete stack..."))
            .then(cloud.deleteStack)
            .then(print("Deletion complete."));
    });

program
    .command('*')
    .action(() => {
        log("No valid command found.")
        program.outputHelp();
    });

program.parse(process.argv);

if (process.argv.slice(2).length <= 0) {
    log("No valid command found.")
    program.outputHelp();
}
