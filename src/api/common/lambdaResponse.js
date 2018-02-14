'use strict';

///Conform the given code and body to the Lambda Proxy Response format.
function makeProxyResponse(code, bodyObj) {
    return {
        statusCode: code,
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(bodyObj)
    };
};

///Promise chainable method for a given statusCode
function toLambdaResponse(statusCode) {
    return function(body) {
        return makeProxyResponse(statusCode, body);
    };
}

exports.toLambdaResponse = toLambdaResponse;
exports.toSuccessfulResponse = toLambdaResponse;
exports.toErrorResponse = toLambdaResponse;
