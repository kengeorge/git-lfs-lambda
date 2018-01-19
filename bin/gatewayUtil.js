const Q = require('Q');
Q.longStackSupport = true;
const fs = require('fs');
const format = require('util').format;

const gll = require('./base.js');
const projectConfig = gll.projectConfig;
const qCall = gll.qCall;
const gateway = new gll.configuredAWS.APIGateway();

exports.getResources = getResources;
exports.deploy = deploy;
exports.getApi = getApi;
exports.remove = remove;
exports.generateSpec = generateSpec;
exports.getApiSpec = getApiSpec;

function getResources(apiName) {
    return getApi(apiName)
        .then(function(api) {
            var params = {
                restApiId: api.id,
                embed: ["methods"],
            }
            return gateway.getResources(params).promise();
        })
        .then(read('items'))
    ;
}

function deploy(apiName) {
    return generateSpec(apiName)
        .then(qCall(uploadApi))
    ;
};

function generateSpec(apiName){
    const apiData = {
        apiTimestamp: new Date().toISOString(),
        apiName: apiName,
        stage: "development",
        hostname: "localhost",
        repoName: projectConfig.repoName,
    };
    return readTemplate("api")
        .then(qCall(replace, apiData))
        .then(qCall(JSON.parse))
};

function getApiSpec(apiName) {
    return getApi(apiName)
        .then(function(api) {
            var params = {
                restApiId: api.id,
                exportType: "swagger",
                stageName: "development",
                accepts: "application/json",
                parameters: {
                    extensions: "integrations"
                }
            }
            return gateway.getExport(params).promise();
        })
        .then(function(results){
            return JSON.parse(results.body);
        })
    ;
};

//TODO this currently always operates on the first matching API (though many may exist)
function getApi(apiName) {
    return gateway.getRestApis({}).promise()
        .then(function(response){
            for(var i in response.items){
                var api = response.items[i];
                if(api.name == apiName) return api;
            }
            throw new Error(format("No api found by the name of %s", apiName));
        })
    ;
};

function remove(apiName){
    return getApi(apiName)
        .then(function(api) {
            return gateway.deleteRestApi({restApiId: api.id}).promise();
        })
    ;
};

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

function fillData(text, placeholderData) {
    return JSON.parse(text, function(key, value) {
        if(typeof value !== 'string') return value;
        var match = value.match(placeholderPattern);
        if(!match) return value;
        return placeholderData[match[1]];
    });
}
