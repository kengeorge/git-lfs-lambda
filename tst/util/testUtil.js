const Q = require('Q');
Q.longStackSupport = true;
const format = require('util').format;
const request = require('request');

const qutils = require("../../src/gll/qutils.js");
const read = qutils.read;
const filter = qutils.filter;
const passTo = qutils.passTo;

const gll = require("../../src/gll/base.js");
const projectConfig = gll.projectConfig;
const gateway = require("../../src/gll/gatewayUtil.js");

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

