const path = require('path');
const os = require('os');
const format = require('util').format;

exports.projectRoot = function() {
    //TODO
    return process.cwd();
};

exports.configFilePath = function() {
    return exports.gllPath("apiConfig.json");
};

exports.gllPath = function(fileName) {
    var p = path.dirname(require.main.filename);
    if(!fileName) return p;
    return path.join(p, fileName);
};

exports.sourceFileForFunction = function(functionName) {
    return path.join(
        exports.apiSourceRoot(),
        functionName + ".js"
    );
};

exports.outputDir = function() {
     return os.tmpdir();
};

exports.deploymentPackageFor = function(functionName) {
    return path.join(
        exports.outputDir(),
        format("deploymentPackage-%s", functionName)
    );
};

exports.templateFile = function() {
    return path.join(
        exports.projectRoot(),
        "template.yaml"
    );
};

exports.apiSourceRoot = function() {
    return path.join(
        exports.projectRoot(),
        "src",
        "api/"
    );
};

exports.commonRoot = function(filename) {
    var p = path.join(
        exports.apiSourceRoot(),
        "common/"
    );
    if(!filename) return p;
    return path.join(p, filename);
};
