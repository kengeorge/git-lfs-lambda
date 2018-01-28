const Q = require('Q');
Q.longStackSupport = true;
const format = require('util').format;
const fs = require('fs');

const qutils = require("../../src/gll/qutils.js");
const read = qutils.read;
const filter = qutils.filter;
const decorate = qutils.decorate;

const gll = require("../../src/gll/base.js");
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

exports.batch = function(repoName, method) {
    var params = {
        apiName: format('%s%s', gll.apiConfig.repoApiPrefix, repoName),
        httpMethod: method,
        resourcePath: format("/%s.git/info/lfs/objects/batch", repoName),
        payload: {
            "operation": "download",
            "transfers": ["basic"],
            "ref": {"name": "refs/heads/master"},
            "objects": [
                {
                    "oid": "sha256:sha256HashOfFile",
                    "size": 123,
                }
            ]
        }
    };
    return Q(params)
        .then(decorate('restApiId', function(params) {
            return Q(params)
                .get('apiName')
                .then(gateway.getFirstApi)
                .get('id')
            ;
        }))
        .then(decorate('resourceId', function(params) {
            return Q(params)
                .get('restApiId')
                .then(gateway.getResources)
                .then(filter(function(res) { return res.path == params.resourcePath;}))
                .get(0)
                .get('id')
            ;
        }))
        .then(qutils.list('restApiId', 'resourceId', 'httpMethod', 'payload'))
        .spread(gateway.testInvokeMethod)
    ;
}

