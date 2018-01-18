'use strict';

const path = require('path');
const format = require('util').format;

const gll = require("./base.js");
const projectConfig = gll.projectConfig;
const functionPath = gll.paths.sourceRootFor;
const log = gll.log;
const pretty = gll.pretty;

var args = process.argv.slice(2);

var method = args.shift();
if(!method) {
    log("No method provided, exiting.");
    process.exit(1);
}

var testTarget = args.shift();
if(!testTarget) {
    testTarget = 'local';
    console.log(format("No test target provided, assuming %s", testTarget));
}
testTarget = testTarget.toLowerCase();

var jsPath = path.join(functionPath(method), method + ".js");
log(jsPath);
var server = require(jsPath);


switch(testTarget) {
    case 'local':
        console.log('Testing locally');
        var event = {};
        var context = {};
        server.handler(event, context, finish);
        process.exit(0);
        break;
    case 'remote':
        throw new Error("Not implemented (i.e. I broke it)");
        break;
    default:
        console.log(format('Unknown test argument [%s]', testTarget));
        process.exit(1);
        break;
}


//=====
function call(){
    var deferred = Q.defer();
    var params = {
        uri: targetInfo.url,
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-amz-docs-region": projectConfig.awsRegion
        },
        json: true,
        body: {
            garbage: "helloooo"
        }
    };
    request(params, function(err, response, body) {
        if(err) deferred.reject(new Error(err));
        else deferred.resolve({ response: response, body: body});
    });
    return deferred.promise;
}



function finish(err, data) {
    if(err) {
        console.log('ERROR');
        log(pretty(err));
        return;
    }
    console.log('SUCCESS');
    log(pretty(data));
}

