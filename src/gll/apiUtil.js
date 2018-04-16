const AWS = require('aws-sdk');
const K = require('kpromise');
const get = K.get;

let api;
exports.configure = (config) => api = new AWS.APIGateway({region: config.awsRegion});

exports.getApi = (apiId) => api
    .getRestApi({restApiId: apiId}).promise()
;

exports.getStage = (apiId) => api
    .getStages({restApiId: apiId}).promise()
    .then(get('item'))
    .then(get('0'))
;
