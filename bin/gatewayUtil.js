const Q = require('Q');
const fs = require('fs');

const gll = require('./base.js');
const projectConfig = gll.projectConfig;
const templateText = gll.templateText;
const log = gll.log;
const pretty = gll.pretty;
const paths = gll.paths;
const format = require('util').format;
const forEach = gll.forEach;
const qify = gll.qify;
const qCall = gll.qCall;
const gateway = new gll.configuredAWS.APIGateway();


var args = process.argv.slice(2);
var command = args.shift();
if(command) command = command.toLowerCase();

var name = args.shift();


exports.deploy = function(apiName) {
    const apiData = {
        apiTimestamp: new Date().toISOString(),
        apiName: apiName,
        stage: "development",
        hostname: "localhost",
        repoName: projectConfig.repoName,
    };
    return readTemplate("api")
        .then(qCall(replace, apiData))
        .then(qCall(uploadApi))
    ;
};

exports.remove = function(apiName){
    return getApi(apiName)
        .then(function(api) {
            return gateway.deleteRestApi({restApiId: api.id}).promise();
        })
    ;
};

function getApi(apiName){
    return gateway.getRestApis({})
        .promise()
        .then(function(response){
            for(var i in response.items){
                var api = response.items[i];
                if(api.name == apiName) return api;
            }
            throw new Error(format("No api found by the name of %s", apiName));
        })
    ;
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

function toObject(text){
    return JSON.parse(text);
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
