'use strict';

const format=require('util').format;

//TODO send configuration / env variables
const m = require('./common/messages.js');
const respond = require('./common/lambdaResponse.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const repo = "cloudrepo";
const bucket = "git-lfs-lambda-" + repo;

function log() {
    var formatted = format.apply(this, Array.from(arguments).map(pretty));
    console.log(formatted);
}

function pretty(data) {
    if(typeof data === 'object') return JSON.stringify(data, null, 2);
    return data;
}

function fakeResponse() {
    var response  = {
        "transfer": "basic",
        "objects": [
            {
                "oid": "1111111",
                "size": 123,
                "authenticated": true,
                "actions": {
                    "download": {
                        "href": "https://some-download.com",
                        "header": {
                            "Key": "value"
                        },
                        "expires_at": "2016-11-10T15:29:07Z",
                    }
                }
            }
        ]
    };
}

function handleUpload(objects, callback) {
    for(var o in objects) {
        var file = objects[o];
        var params = {
            Bucket: bucket,
            Key: file.oid
        };
        log("Uploading as %s", params);
        s3.getSignedUrl('putObject', params,
            function (err, url) {
                callback(err, url);
            });
    }
}

function makeResponse() {
    var res = {};
    return res;
}

const transferType = "basic";

exports.handler = function(event, context, callback) {
    var request = JSON.parse(event.body);
    log("Request ================");
    log(request);
    log("================ Request");

    if(request.transfer && !request.transfer.includes(transferType)) {
        callback(respond(422, fakeResponse()), null);
        return;
    } else {
        log("Transfer type [%s] found.", transferType);
    }

    if(request.operation == "upload") {
        handleUpload(request.objects, function(err, url){
            log("URL: %s", url);
            callback(null, respond(200, fakeResponse()));
        });
    } else if(request.operation == "download") {
        throw new Error("Download not implemented.");
    }

};

