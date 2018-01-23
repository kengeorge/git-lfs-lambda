const Q = require('Q');
Q.longStackSupport = true;
const fs = require('fs');
const format = require('util').format;

const qutils = require('./qutils.js')
const read = qutils.read;
const passTo = qutils.passTo;
const filter = qutils.filter;

const gll = require('./base.js');
const projectConfig = gll.projectConfig;
const gateway = new gll.configuredAWS.APIGateway();

exports.getApis = getApis;
exports.getFirstApi = getFirstApi;
exports.getApiSpec = getApiSpec;
exports.getResources = getResources;
exports.getIntegration = getIntegration;
exports.testInvokeMethod = testInvokeMethod;
exports.createFromSpec = createFromSpec;
exports.remove = remove;
exports.deploy = deploy;

function getResources(api) {
    var params = {
        restApiId: api.id,
        embed: ["methods"],
    }
    return gateway.getResources(params).promise()
        .then(read('items'))
    ;
}

function getApiSpec(api) {
    var params = {
        restApiId: api.id,
        exportType: "swagger",
        stageName: "development",
        accepts: "application/json",
        parameters: {
            extensions: "integrations"
        }
    };
    return gateway.getExport(params).promise()
        .then(read('body'))
        .then(passTo(JSON.parse))
        ;
}

function getIntegration(api){
    var params = {
        httpMethod: method,
        resourceId: resourceId,
        restApiId: api.id

    };
    return gateway.getIntegration(params).promise()
        .then(passTo(JSON.parse))
    ;
}

function getFirstApi(apiName) {
    return getApis(apiName)
        .then(read('0'))
        ;
}

function getApis(apiName) {
    return gateway.getRestApis({}).promise()
        .then(read('items'))
        .then(filter(function (api) {
            return api.name == apiName;
        }))
        ;
}

function remove(api) {
    return gateway.deleteRestApi({restApiId: api.id}).promise();
}

function testInvokeMethod(api, resource, method, payload){
    var params = {
        restApiId: api.id,
        resourceId: resource.id,
        httpMethod: method,
        body: JSON.stringify(payload),
        headers: {
        },
        stageVariables: {
        }
    };
    return gateway.testInvokeMethod(params).promise();
}

function deploy(api, stageName) {
    var params = {
        restApiId: api.id,
        stageName: stageName
    };
    return gateway.createDeployment(params).promise();
}

function createFromSpec(apiSpec) {
    var apiText = JSON.stringify(apiSpec);
    var params = {
        body: Buffer.from(apiText),
        failOnWarnings: true,
        parameters: {
            endpointConfigurationTypes: "REGIONAL",
        }
    };
    return gateway.importRestApi(params).promise();
}


