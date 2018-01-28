const Q = require('Q');
Q.longStackSupport = true;
const fs = require('fs');
const format = require('util').format;

const qutils = require('./qutils.js')
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

function getResources(apiId) {
    var params = {
        restApiId: apiId,
        embed: ["methods"],
    }
    return gateway.getResources(params).promise()
        .get('items')
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
        .get('body')
        .then(JSON.parse)
    ;
}

function getIntegration(api){
    var params = {
        httpMethod: method,
        resourceId: resourceId,
        restApiId: api.id

    };
    return gateway.getIntegration(params).promise()
        .then(JSON.parse)
    ;
}

function getFirstApi(apiName) {
    return getApis(apiName).get(0);
}

function getApis(apiName) {
    return gateway.getRestApis({}).promise()
        .get('items')
        .then(filter(function (api) {
            return api.name == apiName;
        }))
        ;
}

function remove(api) {
    return gateway.deleteRestApi({restApiId: api.id}).promise();
}

function testInvokeMethod(apiId, resourceId, method, payload){
    var params = {
        restApiId: apiId,
        resourceId: resourceId,
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


