




function old() {
//TODO rewrite all this
    async.waterfall([
        makeContext,
        configureAWS,
        getApi,
        updateOrCreateApi,
        getResources,
        createResourceIfNeeded,
        getMethod,
        deleteExistingMethod,
        putMethod,
        putMethodResponse,
        putIntegration,
        putIntegrationResponse,
        getMethod,
        deployApi,
        getStage,
        writeOutput,
    ], function (err, context) {
        if (err) {
            console.log("ERROR!");
            console.log(err, err.stack);
            console.log(JSON.stringify(context, null, 2));
            exitCode = 1;
        } else {
            console.log("Done!");
            exitCode = 0;
        }
        process.exit(exitCode);
    });
}

function makeContext(callback) {
    var args = process.argv.slice(2);
    var context = {
        api: {
            id: null,
            name: args[0],
            description: args[1],
        },
        args: {
            resourceName: "{proxy+}",
            stageName: config.stageName,
            region: config.awsRegion,
            outputFilePath: config.outputFilePath
        },
        lambda: {
            //TODO
            testUri: "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:548425624042:function:gatewayTest/invocations",
        }
    };

    context.getHostName = function() {
        return util.format('%s.execute-api.%s.amazonaws.com',
            this.api.id, this.args.region);
    };

    context.getPath = function() {
        return util.format('/%s/%s', context.args.stageName, "kggeorge");
    };

    callback(null, context);
}

function configureAWS(context, callback) {
    AWS.config.region = context.args.region;
    api = new AWS.APIGateway();
    callback(null, context);
}

function getApi(context, callback) {
    console.log("Checking for existing api with name " + context.api.name);
    api.getRestApis({limit: 100}, function (err, data) {
        for (key in data.items) {
            var a = data.items[key];
            if (a.name == context.api.name) {
                context.api.id = a.id;
                context.previous = a;
                break;
            }
        }
        callback(err, context);
    });
}

function updateApi(context, callback) {
    console.log("Updating existing api " + context.api.id);
    var params = {
        restApiId: context.api.id,
        patchOperations: [{
            op: "replace",
            path: "/description",
            value: context.api.description
        }],
    };
    api.updateRestApi(params, function (err, data) {
        context.api.description = data.description;
        callback(err, context);
    });
}

function makeApi(context, callback) {
    console.log("Creating new api " + context.api.name);
    var params = {
        name: context.api.name,
        description: context.api.description
    };
    api.createRestApi(params, function(err, data) {
        context.api.id = data.id;
        callback(err, context);
    })
}

function updateOrCreateApi(context, callback) {
    if(!context.api.id) {
        makeApi(context, callback);
    } else if(context.previous.description != context.api.description) {
        updateApi(context, callback);
    } else {
        console.log("No changes to api needed.");
        callback(null, context);
    }
}

function getResources(context, callback) {
    var params = {
        restApiId: context.api.id,
    };
    api.getResources(params, function(err, data) {
        for(var key in data.items) {
            var res = data.items[key];
            if(res.path == "/") context.rootResource = res;
            else if(res.path == "/" + context.args.resourceName) context.proxyResource = res;
        }
        callback(err, context);
    });
}

function deleteExistingResource(context, callback) {
    if(!context.proxyResource) {
        callback(null, context);
        return;
    }

    console.log("Deleting existing resource: " + context.proxyResource.path);
    var params = {
        resourceId: context.proxyResource.id,
        restApiId: context.api.id
    };
    api.deleteResource(params, function (err, data) {
        callback(err, context);
    });

}

function createResourceIfNeeded(context, callback) {
    if (context.proxyResource) {
        console.log(context.proxyResource.path + " already exists.");
        callback(null, context);
        return;
    }
    console.log("Creating " + context.args.resourceName);
    var params = {
        restApiId: context.api.id,
        parentId: context.rootResource.id,
        pathPart: context.args.resourceName,
    };
    api.createResource(params, function (err, data) {
        context.proxyResource = data;
        callback(err, context);
    });
}

function putMethod(context, callback) {
    console.log("Configuring method.");
    if(!context.api) {
        callback("Missing api?", context);
        return;
    }
    var params = {
        restApiId: context.api.id,
        resourceId: context.proxyResource.id,

        authorizationType: "NONE",
        httpMethod: "ANY",
        apiKeyRequired: false,
        requestParameters: {
           "method.request.path.proxy": true
        },
    };
    api.putMethod(params, function (err, data) {
        callback(err, context);
    });
}

function putMethodResponse(context, callback) {
    console.log("Configuring method response.");
    var params = {
        restApiId: context.api.id,
        resourceId: context.proxyResource.id,
        httpMethod: "ANY",
        statusCode: "200",
        responseModels: {
            "application/json": "Empty"
        }
    };
    api.putMethodResponse(params, function(err, data) {
        callback(err, context);
    });
}

function putIntegration(context, callback) {
    console.log("Configuring integration.");
    var params = {
        restApiId: context.api.id,
        resourceId: context.proxyResource.id,

        type: "AWS_PROXY",
        httpMethod: "ANY",
        integrationHttpMethod: "ANY",
        uri: context.lambda.testUri,
        passthroughBehavior: "WHEN_NO_MATCH",
        contentHandling: "CONVERT_TO_TEXT",
        timeoutInMillis: 29000,
        cacheNamespace: context.proxyResource.id,
        cacheKeyParameters: [ "method.request.path.proxy" ]
    };
    api.putIntegration(params, function(err, data) {
        callback(err, context);
    });
}

function putIntegrationResponse(context, callback) {
    console.log("Configuring integration response.");
    var params = {
        restApiId: context.api.id,
        resourceId: context.proxyResource.id,
        httpMethod: "ANY",
        statusCode: "200",
        responseTemplates: {
                "application/json": null
        }
    };
    api.putIntegrationResponse(params, function(err, data) {
        callback(err, context);
    });
}

function getMethod(context, callback) {
    console.log("Retrieving method " + context.api.id);
    var params = {
        restApiId: context.api.id,
        resourceId: context.proxyResource.id,
        httpMethod: "ANY",
    };
    api.getMethod(params, function (err, data) {
        context.proxyMethod = data;
        callback(null, context);
    })
}

function deleteExistingMethod(context, callback) {
    if(!context.proxyMethod) {
        callback(null, context);
        return;
    }
    var params = {
        restApiId: context.api.id,
        resourceId: context.proxyResource.id,
        httpMethod: "ANY"
    };
    api.deleteMethod(params, function (err, data) {
        context.proxyMethod = null;
        callback(err, data);
    })
}

function deployApi(context, callback) {
    var params = {
        restApiId: context.api.id,
        description: "Auto-generated api promotion.",
        stageName: context.args.stageName,
        stageDescription: "Testbed for this mess."
    };
    api.createDeployment(params, function (err, data) {
        context.deployment = data;
        callback(err, context);
    });
}

function getStage(context, callback) {
    var params = {
        restApiId: context.api.id,
        stageName: context.args.stageName,
    };
    api.getStage(params, function (err, data) {
        context.stage = data;
        callback(err, context);
    })
}

function writeOutput(context, callback) {
    var url = util.format("https://%s%s", context.getHostName(), context.getPath());
    var out = {
        hostname: context.getHostName(),
        path: context.getPath(),
        url: url
    };
    fs.writeFile(context.args.outputFilePath, JSON.stringify(out), function(err){
        callback(err, context);
    });
}

