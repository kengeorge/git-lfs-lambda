const fs = require('fs');
const format = require('util').format;

const paths = require('./paths.js')

const s3 = require('./s3Util.js');
const cloud = require('./cloudUtil.js');

const K = require('kpromise');
const decorate = K.decorate;
const forEach = K.forEach;
const get = K.get;
const log = K.log;
const passBefore = K.passBefore;
const print = K.print;
const promise = K.promise;
const startWith = K.startWith;
const tap = K.tap;

const zip = require('./zip');

const readFile = (filePath) =>
    promise((res, rej) =>
        fs.readFile(filePath, "utf-8", (err, data) => {
            if(err) rej(err);
            else res(data);
        }))
;

const startWithConfigFor = (repoName, options) =>

    startWith(paths.configFilePath())
        .then(readFile)
        .then(JSON.parse)
        .then(config => {
            config.repoName = repoName;
            config.apiName = format(config.format.apiNameForRepo, repoName).toLowerCase();
            config.bucketName = format(config.format.bucketNameForRepo, repoName).toLowerCase();
            config.deploymentBucket = format(config.format.deploymentBucketName, repoName).toLowerCase();
            config.stackName = format(config.format.stackNameForRepo, repoName).toLowerCase();
            config.changeSetName = format(config.format.changeSetNameForRepo, repoName).toLowerCase();
            config.endpoint = format(config.format.endpointForRepo, repoName).toLowerCase();
            config.awsRegion = options.region;
            return config;
        })
        .then(tap(cloud.configure))
        .then(tap(s3.configure))
;

const upload = (functionName, bucketName) =>
    startWith(functionName)
        .then(print(`Zipping ${functionName}...`))
        .then(zip.zip)
        .then(tap(archive => log(`Zipped with ${archive.size} bytes (${archive.location})`)))
        .then(get("location"))
        .then(zip.readBits)
        .then(print(`Uploading ${functionName}...`))
        .then(passBefore(s3.put, bucketName, functionName + ".zip"))
        .then(() => format("s3://%s/%s.zip", bucketName, functionName))
        .then(tap(url => log(`${functionName} uploaded to ${url}`)))
;

const replace = (text, placeholderData) => {
    for(const key in placeholderData) {
        const data = placeholderData[key];
        const pattern = new RegExp("\\$\\{" + key + "\\}");
        let match;
        while(match = text.match(pattern)) {
            const token = match[0];
            if(data) text = text.replace(token, data);
        }
    }
    return text;
};

const compileTemplate = (fillData) =>
    readFile(paths.templateFile())
        .then(passBefore(replace, fillData))
;

const removeIfEmpty = (bucket) =>
    startWith(bucket)
        .then(print(`Deleting: ${bucket}...`))
        .then(s3.deleteBucket)
        .then(print(`Deleted : ${bucket}`))
        .catch(err => {
            if(!err) throw new Error(`Unknown failure when deleting bucket ${bucket}`);

            switch(err.code) {
                case 'BucketNotEmpty':
                    log(`Skipping delete: ${bucket} -> bucket is not empty.`);
                    log(`Empty the bucket (aws s3 rm s3://${bucket}/ --recursive) and try again.`);
                    throw err;
                case 'NoSuchBucket':
                    log(`Skipping delete: ${bucket} -> already does not exist.`);
                    break;
                default:
                    throw err;
            }
        })
;

exports.generate = (repoName, options) =>
    startWithConfigFor(repoName, options)
        .then(print(`Creating stack for repo '${repoName}' in region '${options.region}...`))
        .then(tap(config => log(`Creating deployment bucket: [${config.deploymentBucket}]...`)))
        .then(tap(config =>
            startWith(config)
                .then(get('deploymentBucket'))
                .then(s3.createBucket)
                .catch(err => {
                    if(err && err.statusCode !== 409) throw new Error(err);
                    log(`Bucket [${config.deploymentBucket}] already exists.`);
                })
        ))
        .then(print("Uploading lambda functions..."))
        .then(tap(config => startWith(paths.functionList())
            .then(forEach(f =>
                startWith(upload(f, config.deploymentBucket))
                    .then(uri => config[f + 'Uri'] = uri)
            ))
        ))

        .then(print("Compiling service template..."))
        .then(decorate('template', compileTemplate))

        .then(print("Creating change set..."))
        .then(cloud.createChangeSet)

        .then(print("Executing change set..."))
        .then(cloud.executeChangeSet)

        .then(res => log(`Created stack '${res.Stacks[0].StackName}' with id: ${res.Stacks[0].StackId}`))
        .then(print("Done!"))
        .catch(err => log(`Creation failed with error: ${err.statusCode} - ${err.message}`))
;

exports.delete = (repoName, options) =>
    startWithConfigFor(repoName, options)
        .then(tap(config => startWith(config)
            .then(get('deploymentBucket'))
            .then(removeIfEmpty)
        ))
        //Manually try to delete artifact bucket first.
        //  If it is not empty, deletion will fail here instead of inside of the stack deletion.
        .then(tap(config => startWith(config)
            .then(get('bucketName'))
            .then(removeIfEmpty)
        ))
        .then(tap(config => startWith(config)
            .then(print(`Deleting: ${config.stackName}...`))
            .then(get('stackName'))
            .then(cloud.deleteStack)
            .then(print(`Deleted : ${config.stackName}`))
        ))
        .then(print("Done!"))
        .catch(err => log(`Deletion failed with error: ${err.statusCode} - ${err.message}`));
;
