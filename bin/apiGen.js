const lambda = require('./lambdaUtil.js');
const gll = require('./base.js');
const log = gll.log;

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
var command = args[0];
if(command == "clean") {
    var rest =args.slice(1);
    console.log(rest);
    for(var i in rest) {
        var name = rest[i];
        lambda.remove(name)
            .then(function (response) {
                log("Function removed: %s", response);

            })
            .catch(function (err) {
                log("Could not remove function %s: %s", name, err);
            })
            .done();
    }
}


