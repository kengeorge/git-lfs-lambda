const fs = require('fs');
const AWS = require('aws-sdk');
const format = require('util').format;
const path = require('path');
const Q = require('Q');

const projectConfig = JSON.parse(fs.readFileSync("config.json"));
AWS.config.update({region: projectConfig.awsRegion});
AWS.config.setPromisesDependency(require('Q').Promise);

function log() {
    var formatted = format.apply(this, arguments);
    console.log(formatted);
}

function pretty(data) {
    if(typeof data === 'object') return JSON.stringify(data, null, 2);
    return data;
}

//Helper to generate a promise function that executes the given function
//  over all items passed in to it.
function forEach(callFunc) {
    return function (input) {
        return Q.all(Array.from(input).map(function (item) {
            return callFunc(item);
        }));
    }
}

function read(fieldName) {
    return function(input) {
        return Q.fcall(function() {
            return input[fieldName];
        });
    }
}

function peek(input) {
    return Q.fcall(function() {
        log(pretty(input));
        return input;
    });
}

function filter(filterFunc) {
    return function(input) {
        return Q.fcall(function(){
            var ret = [];
            for(var k in input){
                var item = input[k];
                if(filterFunc(item)) ret.push(item);
            }
            return ret;
        })
    }
}


//Helper to wrap all items in a collection in a promise call.
function qify(items){
    return Q.all(items.map(function(item){
        return Q.fcall(function() {
            return item;
        })
    }));
}

//Helper for turning a regular function into a promise call for chaining
function qCall(){
    var varArgs = Array.from(arguments);
    return function() {
        var func = varArgs.shift();
        var theseArgs = Array.from(arguments);
        var all = theseArgs.concat(varArgs);
        all.unshift(func);
        return Q.fcall.apply(this, all);
    };
}

function projectRoot() {
    //TODO
    return process.cwd();
}

function deploymentPackageFor(functionName) {
    return path.join(
        projectRoot(),
        projectConfig.outputDir,
        format(projectConfig.deploymentPackageTemplate, functionName)
    );
}

function functionSourceRoot(){
    return path.join(
        projectRoot(),
        projectConfig.sourceDir,
        "functions"
    );
}

function sourceRootFor(functionName) {
    return path.join(
        functionSourceRoot(),
        functionName
    );
}

function commonRoot() {
    return path.join(
        projectRoot(),
        projectConfig.sourceDir,
        "common"
    );
}



module.exports = {
    log: log,
    pretty: pretty,
    paths: {
        functionSourceRoot: functionSourceRoot,
        deploymentPackageFor: deploymentPackageFor,
        sourceRootFor: sourceRootFor,
        commonRoot: commonRoot
    },
    configuredAWS: AWS,
    projectConfig: projectConfig,
    forEach: forEach,
    qify: qify,
    qCall: qCall,
    read: read,
    peek: peek,
    filter: filter
};

