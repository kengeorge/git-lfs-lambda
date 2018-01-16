'use strict';

console.log('Loading function');

const doc = require('dynamodb-doc');

//const dynamo = new doc.DynamoDB();


/**
* Demonstrates a simple HTTP endpoint using API Gateway. You have full
* access to the request and response payload, including headers and
* status code.
*
* To scan a DynamoDB table, make a GET request with the TableName as a
* query string parameter. To put, update, or delete an item, make a POST,
* PUT, or DELETE request respectively, passing in the payload to the
* DynamoDB API as a JSON body.
*/

function lambdaResponse(code, bodyObj) {
    return {
        statusCode: code,
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(bodyObj)
    };
}

exports.handler = function(event, context, callback) {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    var res = {
        message: "api endpoint functional"
    };
    callback(null, lambdaResponse(200, res));
};
