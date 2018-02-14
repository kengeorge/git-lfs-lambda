'use strict';

const format = require('util').format;
const Q = require('q');
const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(Q.Promise);
const s3 = new AWS.S3();

const toLambdaResponse = require('common/lambdaResponse.js').toLambdaResponse;

const qutils = require('common/qutils.js');
const decorateEach = qutils.decorateEach;
const callWithAdditionalArgs = qutils.passBefore;
const forEach = qutils.forEach;

const TRANSFER_TYPE = "basic";
const BUCKET_NAME = process.env.GLL_ARTIFACTS_BUCKET;
const CONTENT_TYPE = "application/octet-stream";


function log() {
    var formatted = format.apply(this, Array.from(arguments).map(pretty));
    console.log(formatted);
}

function pretty(data) {
    if (typeof data === 'object') return JSON.stringify(data, null, 2);
    return data;
}


exports.handler = function (event, context, callback) {
    log(event.body);
    var request = JSON.parse(event.body);
    if (request.transfer && !request.transfer.includes(TRANSFER_TYPE)) {
        return callback(respond(422, {"Error": "Unsupported transfer type"}, null));
    }
    log("ENV: %s", process.env);

    log("REQUEST ================");
    log(request);
    log("================ REQUEST");

    var isUpload = request.operation === "upload";

    return Q(request.objects)
        .then(forEach(objectRequestToObjectResponse))
        .then(decorateEach('actions', callWithAdditionalArgs(getActions, isUpload)))
        .then(objectResponsesToBatchResponse)
        .then(toLambdaResponse(200))
        .then(success(callback));
};

function objectRequestToObjectResponse(item) {
    return {
        oid: item.oid,
        size: item.size,
        authenticated: true,
        actions: {},
    };
}

function getActions(objectResponse, isUpload) {
    return Q(objectResponse)
        .get('oid')
        .then(isUpload
            ? callWithAdditionalArgs(getUrl, 'putObject', CONTENT_TYPE)
            : callWithAdditionalArgs(getUrl, 'getObject')
        )
        .then(toAction)
        .then(function (action) {
            if (isUpload) return {upload: action};
            return {download: action};
        });
}

function getUrl(key, action, contentType) {
    var deferred = Q.defer();
    var params = {
        Bucket: BUCKET_NAME,
        Key: key,
    };

    if (contentType) params.ContentType = contentType;

    s3.getSignedUrl(action, params, function (err, data) {
        if (err) deferred.reject(new Error(err));
        else deferred.resolve(data);
        log(data);
    });
    return deferred.promise;
}

//TODO use to update getActions/getUrl to skip upload actions for items we already have
function exists(item, exist) {
    var params = {
        Bucket: BUCKET_NAME,
        Key: key
    };
    return s3.headObject(params).promise()
        .then(function () {
            return exist ? item : null;
        })
        .catch(function () {
            return exist ? null : item;
        })
        ;
}

function toAction(url) {
    return {
        href: url,
        expires_in: 900
    };
}

function objectResponsesToBatchResponse(objectResponses) {
    return {
        transfer: TRANSFER_TYPE,
        objects: objectResponses
    };
}

function success(callback) {
    return function (responseBody) {
        log("RESPONSE ================");
        log(responseBody);
        log("================ RESPONSE");
        return callback(null, responseBody);
    };
}
