const path = require('path');

const format = require('util').format;

exports.projectRoot = function() {
    //TODO ?
    return process.cwd();
};

exports.gllRoot = function() {
    return path.dirname(require.main.filename);
};

exports.gllPathFor = function(fileName) {
    return path.join(exports.gllRoot(), fileName);
};

exports.deploymentPackageFor = function(functionName) {
    return path.join(
        exports.projectRoot(),
        "tmp",
        format("deploymentPackage-%s", functionName)
    );
};;

exports.functionSourceRoot = function(){
    return path.join(
        exports.projectRoot(),
        "src",
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
        "src",
        "common"
    );
};

exports.apiNameForRepo = function(prefix, repoName) {
    return format('%s%s', prefix, repoName);
};

exports.bucketNameForRepo = function(prefix, repoName) {
    //No upper case characters allowed in bucket names
    return format('%s%s', prefix, repoName).toLowerCase();
};
