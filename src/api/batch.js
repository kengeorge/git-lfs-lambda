'use strict';


const format=require('util').format;
const Q = require('q');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(Q.Promise);
const s3 = new AWS.S3();

const respond = require('common/lambdaResponse.js');
const qutils = require('common/qutils.js');
const forEach = qutils.forEach;
const print = qutils.print;

const transferType = "basic";
const tempConfig = {
    repo: "cloudrpeo",
    bucket: "git-lfs-lambda-cloudrepo"
};

function GetBucket() {
    return tempConfig.bucket;
}

function GetKey(fileName) {
    return fileName;
}

function log() {
    var formatted = format.apply(this, Array.from(arguments).map(pretty));
    console.log(formatted);
}

function pretty(data) {
    if(typeof data === 'object') return JSON.stringify(data, null, 2);
    return data;
}

function getUploadUrl(oid) {
    var deferred = Q.defer();
    var params = {
        Bucket: GetBucket(),
        Key: oid
    };
    s3.getSignedUrl('putObject', params, function(err, data) {
        if(err) deferred.reject(new Error(err));
        else deferred.resolve(data);
    });
    return deferred.promise;
}

function replyVia(callback) {
    return function(items) {
        log("BODY: %s", items);
        var res = respond(200, items);
        log("RES: %s", res);
        return callback(null, res);
    };
}

exports.handler = function(event, context, callback) {
    var request = JSON.parse(event.body);
    if(request.transfer && !request.transfer.includes(transferType)) {
        return callback(respond(422, {"Error":"Unsupported transfer type"}, null));
    }

    if(request.operation == "upload") {

        return Q(request.objects)
            .then(forEach(function(item) {
                return Q(item)
                    .get('oid')
                    .then(GetKey)
                    .then(getUploadUrl)
                ;
            }))
            .then(replyVia(callback))
            .done()
        ;

    } else if(request.operation == "download") {
        throw new Error("Download not implemented.");
    }

};

