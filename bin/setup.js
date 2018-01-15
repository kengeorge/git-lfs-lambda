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

function updateOrCreate(context, callback) {
    if(context.api.id) {
        updateApi(context, callback);
    } else {
        makeApi(context, callback);
    }
}


async.waterfall([
    makeContext,
    checkForExisting,
    updateOrCreate,
], function(err, results) {
    if (err) {
        console.log("Done with error");
        console.log(err, err.stack);
    }
    else {
        console.log("Done!");
        console.log(results);
    }
});
