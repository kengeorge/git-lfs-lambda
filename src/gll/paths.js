const path = require('path');
const os = require('os');
const format = require('util').format;

const SERVER_PACKAGE = "git-lfs-lambda-server";
const gllServer = require(SERVER_PACKAGE);

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
    gllServer.manifest.common
);

exports.apiModules = () => path.join(
    exports.apiSourceRoot(),
    gllServer.manifest.modules
);

exports.apiFile = (forFunction) => path.join(
    exports.apiSourceRoot(),
    gllServer.manifest[forFunction]
);

exports.functionList = () => gllServer.functions;

