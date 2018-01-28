const Q = require('Q');
Q.longStackSupport = true;
const format = require('util').format;
const request = require('request');
const fs = require('fs');

const qutils = require("../../src/gll/qutils.js");
const output = qutils.output;
const read = qutils.read;
const filter = qutils.filter;

const gll = require("../../src/gll/base.js");
const projectConfig = gll.projectConfig;
const gateway = require("../../src/gll/gatewayUtil.js");

//TODO repeated in apiGen
function getConfig(repoName) {
    return Q
        .nfcall(fs.readFile, "./apiConfig.json")
        .then(JSON.parse)
        .then(function(apiConfig) {
            apiConfig.apiName = format('%s%s', apiConfig.repoApiPrefix, repoName);
            apiConfig.repoName = repoName;
            return apiConfig;
        })
        ;
}

exports.gateway = apiGatewayTest;
function apiGatewayTest(apiName, resourcePath, method, payload) {
    return gateway
        .getFirstApi(apiName)
        .then(function (api) {
            return gateway
                .getResources(api)
                .then(filter(function (item) {
                    return item.path == resourcePath;
                }))
                .then(read('0'))
                .then(function (resource) {
                    return gateway.testInvokeMethod(api, resource, method, payload);
                })
                ;
        })
        ;
}


exports.batch = function(repoName) {
    const resourcePath = format("/%s.git/info/lfs/objects/batch", repoName);
    const payload = {
        "operation": "download",
        "transfers": [ "basic" ],
        "ref": { "name": "refs/heads/master" },
        "objects": [
            {
                "oid": "sha256:sha256HashOfFile",
                "size": 123,
            }
        ]
    };
    //gll.log(gll.pretty(f('one')));
    //f that takes incoming and returns desired final value
    //read: f that takes incoming and returns
    return getConfig(repoName)
        .then(qutils.populate('api', function(incoming) {
            return qutils.promiseFor(incoming)
                .then(read('apiName'))
                .then(gateway.getFirstApi)
        }))
        .get('api')
        .tap(output)
        .thenReject("Becuase I want to")
        .then(gateway.getResources)
        .then(filter(function(item) { return item.path == resourcePath; }))
        .then(qutils.firstOrDefault)
        .then(function(resource){
            return gateway.testInvokeMethod()
        })
        .tap(log)
        .thenReject("STOP")
    ;
}

//=====
function callThing(){
    var deferred = Q.defer();
    var url = format("%s/myrepo.git/info/lfs/locks", apiEndpoint);
    var payload = {
        "path": "foo/bar.zip",
        "ref": {
            "name": "refs/heads/my-feature"
        }
    };
    var params = {
        uri: url,
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-amz-docs-region": projectConfig.awsRegion
        },
        json: true,
        body: payload,
    };
    request(params, function(err, response, body) {
        if(err) deferred.reject(new Error(err));
        else deferred.resolve({ response: response, body: body});
    });
    return deferred.promise;
}

