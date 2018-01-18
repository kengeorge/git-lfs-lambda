const lambda = require('./lambdaUtil.js');
const gll = require('./base.js');
const log = gll.log;
const pretty = gll.pretty;

/**
 * Targets:
 * GIT REMOTE
 *   https://mygitserver.com/whatever/repo
 * LFS ROOT (git + .git/info/lfs)
 *   https://mygitserver.com/whatever/repo.git/info/lfs
 * BATCH API (lfs + /objects/batch)
 *   https://mygitserver.com/whatever/repo.git/info/lfs/objects/batch
 */

var schema = {
    //Path prefix to be applied to the apiGateway root before the resources paths
    //repoBase: projectConfig.apiBase,
    apis: {
        batch: {
            path: "/objects/batch",
            methods: ["POST"],
            requiredHeaders: {
                "Accept": "application/vnd.git-lfs+json",
                "Content-Type": "application/vnd.git-lfs+json",
            }
        }
    }
};

var apis = ["batch", "locks"];

var args = process.argv.slice(2);

var command = args.shift().toLowerCase();

switch(command) {
    case "clean":
        cleanFunctions(apis);
        break;
    case "deploy":
        deployFunctions(apis);
        break;
    default:
        log("Uknown operation %s", command);
        process.exit(1);
        break;
}

function cleanFunctions(functionNames) {
    log("Removing functions %s", functionNames);
    for(var i in functionNames) {
        var name = functionNames[i];
        clean(name);
    }
}

function clean(functionName) {
    lambda.remove(functionName)
        .then(function (response) {
            log("Function [%s] removed: %s", functionName, pretty(response));

        })
        .catch(function (err) {
            log("Could not remove function %s: %s", functionName, err);
        })
        .done();
}

function deployFunctions(functionNames) {
    for(var i in functionNames) {
        var name = functionNames[i];
        deploy(name);
    }
}

function deploy(functionName) {
    lambda.deploy(functionName)
        .then(function (response) {
            log("Function [%s] deployed: %s", functionName, pretty(response));
        })
        .catch(function (err) {
            log("Could not deploy function %s:  %s", functionName, err);
        })
        .done();
}