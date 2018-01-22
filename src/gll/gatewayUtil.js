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
exports.generateSpec = generateSpec;
exports.getResources = getResources;
exports.testInvokeMethod = testInvokeMethod;
exports.deploy = deploy;
exports.remove = remove;

function getResources(api) {
    var params = {
        restApiId: api.id,
        embed: ["methods"],
    }
    return gateway.getResources(params).promise()
        .then(read('items'))
    ;
}

function deploy(apiName) {
    return generateSpec(apiName)
        .then(passTo(uploadApi))
        ;
}

function generateSpec(apiName) {
    return readTemplate("api")
        .then(passTo(replace, apiData))
        .then(passTo(JSON.parse))
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

function remove(apiName) {
    return getFirstApi(apiName)
        .then(function (api) {
            return gateway.deleteRestApi({restApiId: api.id}).promise();
        })
        ;
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

function uploadApi(apiText) {
    var params = {
        body: Buffer.from(apiText),
        failOnWarnings: true,
        parameters: {
            endpointConfigurationTypes: "REGIONAL",
        }
    };
    return gateway.importRestApi(params).promise();
}

function readTemplate(type) {
    var deferred = Q.defer();
    fs.readFile("./"+type+"_template.json", "utf-8", function(err, data){
        if(err) deferred.reject(new Error(err));
        else deferred.resolve(data);
    });
    return deferred.promise;
}

function replace(text, placeholderData) {
    for(var key in placeholderData) {
        var data = placeholderData[key];
        var token = format("${%s}", key);
        text = text.replace(token, data);
    }
    var remaining = text.match(/\$\{(\w+)\}/);
    if(!remaining) return text;
    throw new Error(format("Unreplaced token: [%s]", remaining[0]));
}
