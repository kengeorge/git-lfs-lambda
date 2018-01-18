'use strict';

module.exports = function(code, bodyObj) {
    return {
        statusCode: code,
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(bodyObj)
    };
};

