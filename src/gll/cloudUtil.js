const Q = require('Q');
Q.longStackSupport = true;
const paths = require('./paths.js')

const gll = require('./base.js');
const cloud = new gll.configuredAWS.CloudFormation();
const qutils = require(paths.commonRoot('qutils.js'));

exports.createChangeSet = function(templateText, config) {
    //var exists = CheckForExisting(stackName, changeSetName);
    var exists = false;
    var params = {
        TemplateBody: templateText,
        StackName: config.stackName,
        ChangeSetName: config.changeSetName,
        ChangeSetType: exists ? 'UPDATE' : 'CREATE',
        Capabilities: ['CAPABILITY_IAM'],
        Parameters: [
            {
                ParameterKey: 'bucketName',
                ParameterValue: config.bucketName
            },
        ]
    };
    /*
    for(var name in config.lambdaFunctions) {
        params.Parameters.push({
            ParameterKey: name + "Uri",
            ParameterValue: config.lambdaFunctions[name]
        });
    }
    */
    return cloud.createChangeSet(params).promise()
        .tap(function (response) {
            var params = {ChangeSetName: response.Id};
            return cloud.waitFor('changeSetCreateComplete', params).promise();
        });
};

exports.executeChangeSet = function(changeSetResponse){
    var params = {
        ChangeSetName: changeSetResponse.Id,
    };
    return cloud.executeChangeSet(params).promise()
        .tap(function() {
            var params = {
                StackName: changeSetResponse.StackId
            };
            return cloud.waitFor('stackCreateComplete', params).promise();
        });
};

exports.deleteStack = function(stackName) {
    var params = {
        StackName: stackName
    };
    return cloud.deleteStack(params).promise()
        .tap(function() {
            return cloud.waitFor('stackDeleteComplete', params).promise();
        });
};

