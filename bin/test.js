'use strict';

const server = require('../lambda/index.js');
const util = require('util');
const fs = require('fs');
const request = require('request');

console.log("CWD: " + process.cwd());
const config = JSON.parse(fs.readFileSync("./bin/config.json"));
const targetInfo = JSON.parse(fs.readFileSync(config.outputFilePath));

var args = process.argv.slice(2);
var testTarget = args[0];
if(!testTarget) {
    testTarget = 'local';
    console.log(util.format("No test target provided, assuming %s", testTarget));
}
testTarget = testTarget.toLowerCase();


var event = {};
var context = {};

switch(testTarget) {
    case 'local':
        console.log('Testing locally');
        server.handler(event, context, finish);
        process.exit(0);
        break;
    case 'remote':
        callRemote();
        break;
    default:
        console.log(util.format('Unknown test argument [%s]', testTarget));
        process.exit(1);
        break;
}




//=====

function callRemote() {
    var params = {
        uri: targetInfo.url,
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-amz-docs-region": config.awsRegion
        },
        json: true,
        body: {
            garbage: "helloooo"
        }
    };
    log("Calling %s on [%s]",
        params.method,
        params.url
    );
    request(params, function(err, response, body) {
        console.log("Response:");
        print(response);
        finish(err, body);
    });
}

function print(data) {
    console.log(JSON.stringify(data, null, 2));
}

function log() {
    var formatted = util.format.apply(this, arguments);
    console.log(formatted);
}

function finish(err, data) {
    if(err) {
        console.log('Error body');
        print(err);
        return;
    }
    console.log('Success body:');
    print(data);
}

