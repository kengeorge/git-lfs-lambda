'use strict';

const format = require('util').format;
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
const BUCKET_NAME = process.env.GLL_ARTIFACTS_BUCKET;

function batchResponse(objects) {
    return Q({transfer: transferType})
        .then(decorate('objects', function () {
            return Q(objects)
                .then(forEach(function (o) {
                    var res = {
                        oid: o.oid,
                        size: o.size,
                        authenticated: true,
                        actions: {}
                    };
                    if(o.uploadUrl) res.actions.upload = makeAction(o.uploadUrl);
                    if(o.downloadUrl) res.actions.download = makeAction(o.downloadUrl);
                    return res;
                }))
        }))
        ;
}

function makeAction(href) {
    return {
        href: href,
        expires_in: 900
    };
}

function log() {
    var formatted = format.apply(this, Array.from(arguments).map(pretty));
    console.log(formatted);
}

function pretty(data) {
    if (typeof data === 'object') return JSON.stringify(data, null, 2);
    return data;
}

function sign(item, action) {
    var deferred = Q.defer();
    var params = {
        Bucket: BUCKET_NAME,
        Key: item.oid,
    };
    if(action === 'putObject') params.ContentType = "application/octet-stream";
    s3.getSignedUrl(action, params, function (err, data) {
        if (err) deferred.reject(new Error(err));
        else deferred.resolve(data);
        log(data);
    });
    return deferred.promise;
}

function getUploadUrl(item) {
    return sign(item, 'putObject');
}

function getDownloadUrl(item) {
    return sign(item, 'getObject');
}

function replyVia(callback) {
    return function (items) {
        var res = respond(200, items);
        log("RESPONSE ================");
        log(res);
        log("================ RESPONSE");
        return callback(null, res);
    };
}

exports.handler = function (event, context, callback) {
    var request = JSON.parse(event.body);
    if (request.transfer && !request.transfer.includes(transferType)) {
        return callback(respond(422, {"Error": "Unsupported transfer type"}, null));
    }
    log("ENV: %s", process.env);

    log("REQUEST ================");
    log(request);
    log("================ REQUEST");


    if (request.operation == "upload") {
        return Q(request.objects)
            .then(decorateEach('uploadUrl', getUploadUrl))
            .then(batchResponse)
            .then(replyVia(callback))
            .done()
            ;
    } else if (request.operation == "download") {
        return Q(request.objects)
            .then(decorateEach('downloadUrl', getDownloadUrl))
            .then(batchResponse)
            .then(replyVia(callback))
            .done()
            ;
    }

};

