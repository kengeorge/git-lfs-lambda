const path = require('path');
const gll = require('./base.js');

const format = require('util').format;

exports.projectRoot = function() {
    //TODO ?
    return process.cwd();
};

exports.deploymentPackageFor = function(functionName) {
    return path.join(
        exports.projectRoot(),
        gll.projectConfig.outputDir,
        format(gll.projectConfig.deploymentPackageTemplate, functionName)
    );
};;

exports.functionSourceRoot = function(){
    return path.join(
        exports.projectRoot(),
        gll.projectConfig.sourceDir,
        "functions"
    );
};

exports.sourceRootFor = function(functionName) {
    return path.join(
        exports.functionSourceRoot(),
        functionName
    );
};

exports.commonRoot = function() {
    return path.join(
        exports.projectRoot(),
        gll.projectConfig.sourceDir,
        "common"
    );
};

exports.apiNameForRepo = function(repoName) {
    return format('%s%s', gll.apiConfig.repoApiPrefix, repoName);
};

exports.bucketNameForRepo = function(repoName) {
    //No upper case characters allowed in bucket names
    return format('%s%s', gll.apiConfig.bucketPrefix, repoName).toLowerCase();
};
