const fs = require('fs');
const AWS = require('aws-sdk');
const format = require('util').format;
const paths = require('./paths.js');

const apiConfig = JSON.parse(fs.readFileSync(paths.gllPath("gllConfig.json")));
AWS.config.update({region: apiConfig.awsRegion});
AWS.config.setPromisesDependency(require('Q').Promise);

function log() {
    var formatted = format.apply(this, Array.from(arguments).map(pretty));
    console.log(formatted);
}

function pretty(data) {
    if(typeof data === 'object') return JSON.stringify(data, null, 2);
    return data;
}

module.exports = {
    log: log,
    pretty: pretty,
    configuredAWS: AWS,
    apiConfig: apiConfig
};

