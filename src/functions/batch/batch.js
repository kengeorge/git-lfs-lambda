'use strict';

const m = require('./common/messages.js');
const respond = require('./common/lambdaResponse.js');


exports.handler = function(event, context, callback) {
    var response = {
        message:  "Batch api v: " + m.currentVersion
    };
    callback(null, respond(200, response));
};
