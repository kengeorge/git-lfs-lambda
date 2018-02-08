'use strict';


const format=require('util').format;
const Q = require('q');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(Q.Promise);
const s3 = new AWS.S3();

const respond = require('common/lambdaResponse.js');
const qutils = require('common/qutils.js');
const decorateEach = qutils.decorateEach;
const decorate = qutils.decorate;
const forEach = qutils.forEach;

const transferType = "basic";
const tempConfig = {
    repo: "cloudrpeo",
    bucket: "git-lfs-lambda-cloudrepo"
};

function GetBucket() {
    return tempConfig.bucket;
}

function batchResponse(objects) {
   return Q({transfer: transferType})
       .then(decorate('objects', function(){
           return Q(objects)
               .then(forEach(function(o){
                   return {
                       oid: o.oid,
                       size: o.size,
                       authenticated: true,
                       actions: {
                           upload: {
                               href: o.uploadUrl,
                               header: {
                               },
                               expires_in: 900
                           }
                       }
                   };
               }))
       }))
       .tap(log)
    ;
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
        var res = respond(200, items);
        log("FINAL RESPONSE: %s", res);
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
            .then(decorateEach('uploadUrl', function(item) {
                return Q(item)
                    .get('oid')
                    .then(GetKey)
                    .then(getUploadUrl)
                ;
            }))
            .then(batchResponse)
            .tap(log)
            .then(replyVia(callback))
            .done()
        ;
    } else if(request.operation == "download") {
        throw new Error("Download not implemented.");
    }

};

