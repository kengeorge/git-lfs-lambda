const fs = require('fs');
const AWS = require('aws-sdk');
const format = require('util').format;
const path = require('path');

const projectConfig = JSON.parse(fs.readFileSync("config.json"));
AWS.config.region = projectConfig.awsRegion;
AWS.config.setPromisesDependency(require('Q').Promise);

function log() {
    var formatted = format.apply(this, arguments);
    console.log(formatted);
}

function pretty(data) {
    return JSON.stringify(data, null, 2);
}

function projectRoot() {
    //TODO
    return process.cwd();
}

function deploymentPackageFor(functionName) {
    return path.join(projectRoot(),
        projectConfig.outputDir,
        format(projectConfig.deploymentPackageTemplate, functionName)
    );
}

function sourceRootFor(functionName) {
    return path.join(projectRoot(),
        projectConfig.sourceDir,
        "functions",
        functionName
    );
}

function commonRoot() {
    return path.join(projectRoot(),
        projectConfig.sourceDir,
        "common"
    );
}

module.exports = {
    log: log,
    pretty: pretty,
    paths: {
        projectRoot: projectRoot,
        deploymentPackageFor: deploymentPackageFor,
        sourceRootFor: sourceRootFor,
        commonRoot: commonRoot
    },
    configuredAWS: AWS,
    projectConfig: projectConfig,
};

