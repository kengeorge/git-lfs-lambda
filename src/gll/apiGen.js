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
const fork = K.tap;
const log = K.log;
const promise = K.promise;
const passBefore = K.passBefore;
const get = K.get;

const zip = require('./zip');

/**
 * Initializes a repo configuration object.
 * @param repoName
 * @returns {PromiseLike<T> | Promise<T>}
 */
function startRepoConfigFor(repoName) {
    return startWith(gll.apiConfig)
        .then(config => {
            config.repoName = repoName;
            config.apiName = format(config.format.apiNameForRepo, repoName).toLowerCase();
            config.bucketName = format(config.format.bucketNameForRepo, repoName).toLowerCase();
            config.deploymentBucket = format(config.format.deploymentBucketName, repoName).toLowerCase();
            config.stackName = format(config.format.stackNameForRepo, repoName).toLowerCase();
            config.changeSetName = format(config.format.changeSetNameForRepo, repoName).toLowerCase();
            config.endpoint = format(config.format.endpointForRepo, repoName).toLowerCase();
            return config;
        });
}

function upload(functionName, bucketName) {
    return startWith(functionName)
        .then(print(`Zipping ${functionName}...`))
        .then(zip.zip)
        .then(say("Zipped with ${size} bytes (${location})"))
        .then(get("location"))
        .then(zip.readBits)
        .then(print(`Uploading ${functionName}...`))
        .then(passBefore(s3.put, bucketName, functionName + ".zip"))
        .then(() => format("s3://%s/%s.zip", bucketName, functionName))
        .then(tap((url) => log(`${functionName} uploaded to ${url}`)))
    ;
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

function say(message) {
    return (instance) => {
        if(typeof instance === 'object') log(replace(message, instance));
        else log(message, instance);
        return instance;
    }
}

program
    .command('generate <repoName>')
    .description('Deploy a new git-lfs-lambda repo')
    .action((repoName) => {

        startRepoConfigFor(repoName)
            .then(say("Creating S3 bucket [${deploymentBucket}] for deployment..."))
            .then(tap((config) =>
                startWith(config)
                    .then(get('deploymentBucket'))
                    .then(s3.createBucket)
                    .catch((err) => {
                        if(err && err.statusCode != 409) throw new Error(err);
                        log(`Bucket [${config.deploymentBucket}] already exists.`);
                    })
            ))
            .then(print("Uploading lambda functions..."))
            .then(decorate('batchUri', instance => upload('batch', instance.deploymentBucket)))
            .then(decorate('verifyObjectUri', instance => upload('verifyObject', instance.deploymentBucket)))
            .then(decorate('verifyLocksUri', instance => upload('verifyLocks', instance.deploymentBucket)))
            .then(decorate('listLocksUri', instance => upload('listLocks', instance.deploymentBucket)))
            .then(decorate('createLockUri', instance => upload('createLock', instance.deploymentBucket)))
            .then(decorate('deleteLockUri', instance => upload('deleteLock', instance.deploymentBucket)))

            .then(decorate('template', compileTemplate))

            .then(print("Creating change set..."))
            .then(instance => cloud.createChangeSet(instance.template, instance))

            .then(print("Executing change set..."))
            .then(cloud.executeChangeSet)

            .then(print('========= RESULT =========='))
            .then(peek)
            .then(print('========== DONE ==========='));
    });


program
    .command('delete <repoName>')
    .action((repoName) => {
        //TODO this is dangerous; add confirmation inputs
        return startRepoConfigFor(repoName)
            /* TODO finish delete bucket (needs emptying)
            .then(fork((config) => startWith(config)
                .then(get('deploymentBucket'))
                .then(say('Deleting bucket: %s...'))
                .then(s3.deleteBucket)
                .then(say('Deleted bucket: %s'))
            ))
            */
            .then(fork((config) => startWith(config)
                .then(get('stackName'))
                .then(print(`Deleting stack: ${config.stackName}...`))
                .then(cloud.deleteStack)
                .then(print(`Deleted stack: ${config.stackName}`))
            ))
    });

program
    .command('*')
    .action(() => {
        log("No valid command found.")
        program.outputHelp();
    });

program.parse(process.argv);

if(process.argv.slice(2).length <= 0) {
    log("No valid command found.")
    program.outputHelp();
}
