const path = require('path');
const os = require('os');
const format = require('util').format;

const SERVER_PACKAGE = "git-lfs-lambda-server";
const manifest = require(SERVER_PACKAGE).manifest;

exports.projectRoot = () => path.dirname(require.main.filename);

exports.configFilePath = () => path.join(
    exports.projectRoot(),
    "gllConfig.json"
);

exports.gllPath = (fileName) => {
    const p = path.join(
        exports.projectRoot(),
        "src",
        "gll"
    );
    if(!fileName) return p;
    return path.join(p, fileName);
};


exports.outputDir = () => os.tmpdir();

exports.deploymentPackageFor = (functionName) => path.join(
    exports.outputDir(),
    format("deploymentPackage-%s.zip", functionName)
);

exports.templateFile = () => path.join(
    exports.projectRoot(),
    "template.yaml"
);

exports.apiSourceRoot = () => path.dirname(require.resolve(SERVER_PACKAGE));

exports.apiCommon = () => path.join(
    exports.apiSourceRoot(),
    manifest.common
);

exports.apiModules = () => path.join(
    exports.apiSourceRoot(),
    manifest.modules
);

exports.apiFile = (forFunction) => path.join(
    exports.apiSourceRoot(),
    manifest[forFunction]
);

