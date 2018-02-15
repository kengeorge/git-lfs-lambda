'use strict';

const toLambdaResponse = require('common/lambdaResponse.js').toLambdaResponse;
const log = require('common/common.js').log;
const chain = require('common/promiseHelpers.js');
const forEach = chain.forEach;
const decorate = chain.decorate;
const get = chain.get;
const startWith = chain.startWith;

const TRANSFER_TYPE = "basic";
const S3Datastore = require('common/S3Datastore.js');
const datastore = new S3Datastore(process.env.GLL_ARTIFACTS_BUCKET);


exports.handler = function(event, context, callback) {
    log(event.body);
    let request = JSON.parse(event.body);
    if(request.transfer && !request.transfer.includes(TRANSFER_TYPE)) {
        return callback(respond(422, {"Error": "Unsupported transfer type"}, null));
    }
    log("REQUEST vvvvvvvvvvvvvvvv");
    log(request);
    log("^^^^^^^^^^^^^^^^ REQUEST");

    let isUpload = request.operation === "upload";

    return startWith(request.objects)
        .then(forEach(objectRequestToObjectResponse))
        .then(forEach(decorate('actions', (obj) => {
            return startWith(obj)
                .then(get('oid'))
                .then(isUpload ? datastore.getUploadUrl : datastore.getDownloadUrl)
                .then(toAction)
                .then((action) => isUpload ? {upload: action} : {download: action});
        })))
        .then(toBatchResponseFormat)
        .then(chain.print("RESPONSE vvvvvvvvvvvvvvvv"))
        .then(chain.peek)
        .then(chain.print("^^^^^^^^^^^^^^^^ RESPONSE"))
        .then(toLambdaResponse(200))
        .then((res) => callback(null, res))
    ;
};

function objectRequestToObjectResponse(item) {
    return {
        oid: item.oid,
        size: item.size,
        authenticated: true,
        actions: {},
    };
}

function toAction(url) {
    return {
        href: url,
        expires_in: 900
    };
}

function toBatchResponseFormat(objectResponses) {
    return {
        transfer: TRANSFER_TYPE,
        objects: objectResponses
    };
}
