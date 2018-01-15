var AWS = require('aws-sdk');
var async = require('async');
AWS.config.region = "us-west-2";
var api = new AWS.APIGateway();

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
        },
        lambda: {
            //TODO
            testUri: "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:548425624042:function:gatewayTest/invocations",
        }
    };
    callback(null, context);
}

function checkForExisting(context, callback) {
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

async.waterfall([
    makeContext,
    checkForExisting,
    updateOrCreateApi,
    getResources,
    createResourceIfNeeded,
    getMethod,
    deleteExistingMethod,
    putMethod,
    putMethodResponse,
    putIntegration,
    putIntegrationResponse,
    getMethod
], function(err, results) {
    if (err) {
        console.log("ERROR!");
        console.log(err, err.stack);
    } else {
        console.log("Done!");
    }
    console.log(JSON.stringify(results, null, 2));
});
