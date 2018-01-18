const lambda = require('./lambdaUtil.js');

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

var args = process.argv.slice(2);
var name = args[0];
lambda.deploy(name);


