'use strict';

const m = require('./common/messages.js');
const respond = require('./common/lambdaResponse.js');


exports.handler = function(event, context, callback) {
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
    callback(null, respond(200, response));
};
